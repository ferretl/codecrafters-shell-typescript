import { createInterface, type Interface } from "node:readline";
import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import type * as IO from "fp-ts/IO";
import type { TaskEither } from "fp-ts/lib/TaskEither";
import * as O from "fp-ts/Option";
import * as RA from "fp-ts/ReadonlyArray";
import * as T from "fp-ts/Task";
import { makeBuiltins } from "./builtins";
import {
	type CommandError,
	type CommandResult,
	ResultTag,
} from "./commmandTypes";
import { makeShellCompleter, type ShellCompleter } from "./completion";
import { type Dispatch, dispatchCommand } from "./dispatch";
import {
	appendHistoryLines,
	type HistoryRef,
	makeHistoryRef,
	readHistoryLines,
} from "./histroyRef";
import { type Job, type JobsRef, makeJobsRef } from "./jobsRef";
import parseLine, { type ParsedPipeline } from "./parser";
import { buildPipeline, type PipelineBuild } from "./pipeline";

const makeReadline =
	(completer: ShellCompleter, history: string[]): IO.IO<Interface> =>
	() =>
		createInterface({
			input: process.stdin,
			output: process.stdout,
			prompt: "$ ",
			completer,
			history,
		});

const handleShellExit =
	(readline: Interface, historyRef: HistoryRef) =>
	(result: CommandResult): T.Task<void> =>
	async () => {
		if (result._tag !== ResultTag.Exit) return;
		const unsaved = historyRef.readUnsaved();
		await appendHistoryLines(unsaved)();
		historyRef.markSaved();
		readline.close();
		process.exit(result.code);
	};

const handlePipelineFinal =
	(readline: Interface, historyRef: HistoryRef) =>
	(result: E.Either<CommandError, CommandResult>): T.Task<void> =>
		pipe(
			result,
			E.match(
				(err) =>
					T.fromIO(() => {
						console.error(err.message);
					}),
				handleShellExit(readline, historyRef),
			),
		);

const isBlankPipeline = (pipeline: ParsedPipeline): boolean =>
	pipeline.segments.length === 1 && pipeline.segments[0].name === "";

const formatStartLine = (job: Job): string =>
	`[${job.jobNumber}]${pipe(
		job.pid,
		O.match(
			() => "",
			(pid) => ` ${pid}`,
		),
	)}`;

const reportBackgroundResult = (
	result: E.Either<CommandError, CommandResult>,
): void =>
	pipe(
		result,
		E.match(
			(err) => {
				console.error(err.message);
			},
			() => undefined,
		),
	);

const reportBackground = (
	results: ReadonlyArray<E.Either<CommandError, CommandResult>>,
): void =>
	pipe(
		results,
		RA.last,
		O.match(() => undefined, reportBackgroundResult),
	);

// Fire-and-forget: register the job, print `[n] pid`, then let the pipeline's
// completion run detached so the prompt returns immediately. When it finishes
// we surface any error and reap the entry (silent — no `Done` notification).
const handleBackground =
	(jobsRef: JobsRef, command: string) =>
	(build: PipelineBuild): T.Task<void> =>
	async () => {
		const lastPid = pipe(build.pids, RA.last, O.flatten);
		const job = jobsRef.add(lastPid, command)();
		console.log(formatStartLine(job));
		void T.sequenceArray(build.completedTasks)().then((results) => {
			reportBackground(results);
			jobsRef.remove(job.jobNumber)();
		});
	};

const executeBackground = (
	dispatch: Dispatch,
	jobsRef: JobsRef,
	command: string,
	pipeline: ParsedPipeline,
): T.Task<void> =>
	pipe(
		T.fromIO(buildPipeline(dispatch)(pipeline)),
		T.chain(handleBackground(jobsRef, command)),
	);

const handleCompletedTasks = (
	completedTasks: ReadonlyArray<TaskEither<CommandError, CommandResult>>,
	readline: Interface,
	historyRef: HistoryRef,
): T.Task<void> =>
	pipe(
		completedTasks,
		T.sequenceArray,
		T.chain((results) =>
			pipe(
				results,
				RA.last,
				O.match(
					() => T.of(undefined),
					(result) => handlePipelineFinal(readline, historyRef)(result),
				),
			),
		),
	);

const executePipeline = (
	readline: Interface,
	dispatch: Dispatch,
	historyRef: HistoryRef,
	pipeline: ParsedPipeline,
): T.Task<void> =>
	pipe(
		T.fromIO(buildPipeline(dispatch)(pipeline)),
		T.chain(({ completedTasks }) =>
			handleCompletedTasks(completedTasks, readline, historyRef),
		),
	);

const runPipeline =
	(
		readline: Interface,
		dispatch: Dispatch,
		historyRef: HistoryRef,
		jobsRef: JobsRef,
		command: string,
	) =>
	(pipeline: ParsedPipeline): T.Task<void> =>
		isBlankPipeline(pipeline)
			? T.of(undefined)
			: pipeline.background
				? executeBackground(dispatch, jobsRef, command, pipeline)
				: executePipeline(readline, dispatch, historyRef, pipeline);

const runLine =
	(
		readline: Interface,
		home: string,
		dispatch: Dispatch,
		historyRef: HistoryRef,
		jobsRef: JobsRef,
	) =>
	(line: string): T.Task<void> =>
		pipe(
			parseLine(line, home),
			E.match(
				(err) =>
					T.fromIO(() => {
						console.error(err.message);
					}),
				runPipeline(readline, dispatch, historyRef, jobsRef, line.trim()),
			),
		);

const loop = async (
	readline: Interface,
	home: string,
	dispatch: Dispatch,
	historyRef: HistoryRef,
	jobsRef: JobsRef,
): Promise<void> => {
	readline.prompt();
	for await (const line of readline) {
		if (line.trim().length > 0) {
			historyRef.append([line])();
		}
		await runLine(readline, home, dispatch, historyRef, jobsRef)(line)();
		readline.prompt();
	}
	process.exit(0);
};

const main = async (): Promise<void> => {
	const historyRef = makeHistoryRef();
	const readlineHistory: string[] = await readHistoryLines();
	historyRef.seed(readlineHistory)();
	const jobsRef = makeJobsRef();
	const registry = makeBuiltins(historyRef, jobsRef);
	const dispatch = dispatchCommand(registry);
	const completer = makeShellCompleter();
	const readline = makeReadline(completer, readlineHistory)();
	const home = process.env.HOME ?? "~";
	await loop(readline, home, dispatch, historyRef, jobsRef);
};

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
