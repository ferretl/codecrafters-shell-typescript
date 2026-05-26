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
import { fromReadlineHistory } from "./histroy";
import parseLine, { type ParsedPipeline } from "./parser";
import { buildPipeline } from "./pipeline";
import { type CommandError, type CommandResult, ResultTag } from "./types";

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

const executePipeline = (
	readline: Interface,
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
							(result) => T.fromIO(handlePipelineFinal(readline)(result)),
						),
					),
				),
			),
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
): Promise<void> => {
	readline.prompt();
	for await (const line of readline) {
		await runLine(readline, home, dispatch)(line)();
		readline.prompt();
	}
};

const main = async (): Promise<void> => {
	const historyArr: string[] = [];
	const historyRef = fromReadlineHistory(historyArr);
	const registry = makeBuiltins(historyRef);
	const dispatch = dispatchCommand(registry);
	const completer = makeShellCompleter();
	const readline = makeReadline(completer, historyArr)();
	const home = process.env.HOME ?? "~";
	await loop(readline, home, dispatch);
};

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
