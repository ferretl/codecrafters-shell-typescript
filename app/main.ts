import { createInterface, type Interface } from "node:readline";
import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import type * as IO from "fp-ts/IO";
import type { TaskEither } from "fp-ts/lib/TaskEither";
import * as O from "fp-ts/Option";
import * as RA from "fp-ts/ReadonlyArray";
import * as T from "fp-ts/Task";
import { makeBuiltins } from "./builtins";
import { makeShellCompleter, type ShellCompleter } from "./completion";
import { type Dispatch, dispatchCommand } from "./dispatch";
import { type HistoryRef, makeHistoryRef, readHistoryLines } from "./histroy";
import parseLine, { type ParsedPipeline } from "./parser";
import { buildPipeline } from "./pipeline";
import { type CommandError, type CommandResult, ResultTag } from "./types";
import * as TE from "fp-ts/TaskEither";

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
	(readline: Interface) =>
	(result: CommandResult): IO.IO<void> =>
	() => {
		if (result._tag === ResultTag.Exit) {
			readline.close();
			process.exit(result.code);
		}
	};

const handlePipelineFinal =
	(readline: Interface) =>
	(result: E.Either<CommandError, CommandResult>): IO.IO<void> =>
		pipe(
			result,
			E.match(
				(err) => () => {
					console.error(err.message);
				},
				handleShellExit(readline),
			),
		);

const isBlankPipeline = (pipeline: ParsedPipeline): boolean =>
	pipeline.length === 1 && pipeline[0].name === "";

const handleCompletedTasks = (
	completedTasks: ReadonlyArray<TaskEither<CommandError, CommandResult>>,
	readline: Interface,
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
					(result) => T.fromIO(handlePipelineFinal(readline)(result)),
				),
			),
		),
	);

const executePipeline = (
	readline: Interface,
	dispatch: Dispatch,
	pipeline: ParsedPipeline,
): T.Task<void> =>
	pipe(
		T.fromIO(buildPipeline(dispatch)(pipeline)),
		T.chain(({ completedTasks }) =>
			handleCompletedTasks(completedTasks, readline),
		),
	);

const runPipeline =
	(readline: Interface, dispatch: Dispatch) =>
	(pipeline: ParsedPipeline): T.Task<void> =>
		isBlankPipeline(pipeline)
			? T.of(undefined)
			: executePipeline(readline, dispatch, pipeline);

const runLine =
	(readline: Interface, home: string, dispatch: Dispatch) =>
	(line: string): T.Task<void> =>
		pipe(
			parseLine(line, home),
			E.match(
				(err) =>
					T.fromIO(() => {
						console.error(err.message);
					}),
				runPipeline(readline, dispatch),
			),
		);

const loop = async (
	readline: Interface,
	home: string,
	dispatch: Dispatch,
	historyRef: HistoryRef,
): Promise<void> => {
	readline.prompt();
	for await (const line of readline) {
		if (line.trim().length > 0) {
			historyRef.append([line])();
		}
		await runLine(readline, home, dispatch)(line)();
		readline.prompt();
	}
};

const main = async (): Promise<void> => {
	const historyRef = makeHistoryRef();
	const readlineHistory: string[] = await readHistoryLines();
	historyRef.seed(readlineHistory)();
	const registry = makeBuiltins(historyRef);
	const dispatch = dispatchCommand(registry);
	const completer = makeShellCompleter();
	const readline = makeReadline(completer, readlineHistory)();
	const home = process.env.HOME ?? "~";
	await loop(readline, home, dispatch, historyRef);
};

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
