import { createInterface, type Interface } from "node:readline";
import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import type * as IO from "fp-ts/IO";
import * as O from "fp-ts/Option";
import * as RA from "fp-ts/ReadonlyArray";
import * as T from "fp-ts/Task";
import { makeBuiltins } from "./builtins";
import { makeShellCompleter, type ShellCompleter } from "./completion";
import { type Dispatch, dispatchCommand } from "./dispatch";
import { type HistoryRef, makeHistoryRef } from "./histroy";
import parseLine, { type ParsedPipeline } from "./parser";
import { buildPipeline } from "./pipeline";
import { type CommandError, type CommandResult, ResultTag } from "./types";

const makeReadline =
	(completer: ShellCompleter): IO.IO<Interface> =>
	() =>
		createInterface({
			input: process.stdin,
			output: process.stdout,
			prompt: "$ ",
			completer,
		});

const handleShellExit =
	(rl: Interface) =>
	(result: CommandResult): IO.IO<void> =>
	() => {
		if (result._tag === ResultTag.Exit) {
			rl.close();
			process.exit(result.code);
		}
	};

const handlePipelineFinal =
	(rl: Interface) =>
	(result: E.Either<CommandError, CommandResult>): IO.IO<void> =>
		pipe(
			result,
			E.match(
				(err) => () => {
					console.error(err.message);
				},
				handleShellExit(rl),
			),
		);

const isBlankPipeline = (pipeline: ParsedPipeline): boolean =>
	pipeline.length === 1 && pipeline[0].name === "";

const executePipeline = (
	rl: Interface,
	dispatch: Dispatch,
	pipeline: ParsedPipeline,
): T.Task<void> =>
	pipe(
		T.fromIO(buildPipeline(dispatch)(pipeline)),
		T.chain(({ dones }) =>
			pipe(
				dones,
				T.sequenceArray,
				T.chain((results) =>
					pipe(
						results,
						RA.last,
						O.match(
							() => T.of(undefined),
							(r) => T.fromIO(handlePipelineFinal(rl)(r)),
						),
					),
				),
			),
		),
	);

const recordPipeline = (
	ref: HistoryRef,
	pipeline: ParsedPipeline,
): IO.IO<void> =>
	ref.modify((entries) => [...entries, ...pipeline.map((s) => s.name)]);

const runPipeline =
	(rl: Interface, dispatch: Dispatch, ref: HistoryRef) =>
	(pipeline: ParsedPipeline): T.Task<void> =>
		isBlankPipeline(pipeline)
			? T.of(undefined)
			: pipe(
					T.fromIO(recordPipeline(ref, pipeline)),
					T.chain(() => executePipeline(rl, dispatch, pipeline)),
				);

const runLine =
	(rl: Interface, home: string, dispatch: Dispatch, ref: HistoryRef) =>
	(line: string): T.Task<void> =>
		pipe(
			parseLine(line, home),
			E.match(
				(err) =>
					T.fromIO(() => {
						console.error(err.message);
					}),
				runPipeline(rl, dispatch, ref),
			),
		);
const loop = async (
	rl: Interface,
	home: string,
	dispatch: Dispatch,
	ref: HistoryRef,
): Promise<void> => {
	rl.prompt();
	for await (const line of rl) {
		await runLine(rl, home, dispatch, ref)(line)();
		rl.prompt();
	}
};

const main = async (): Promise<void> => {
	const historyRef = makeHistoryRef();
	const registry = makeBuiltins(historyRef);
	const dispatch = dispatchCommand(registry);
	const completer = makeShellCompleter();
	const rl = makeReadline(completer)();
	const home = process.env.HOME ?? "~";
	await loop(rl, home, dispatch, historyRef);
};

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
