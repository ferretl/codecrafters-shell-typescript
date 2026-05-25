import { createInterface, type Interface } from "node:readline";
import * as E from "fp-ts/Either";
import type * as IO from "fp-ts/IO";
import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import * as RA from "fp-ts/ReadonlyArray";
import * as T from "fp-ts/Task";
import { makeShellCompleter, type ShellCompleter } from "./completion";
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
			setImmediate(() => process.exit(result.code));
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

const runPipeline =
	(rl: Interface) =>
	(pipeline: ParsedPipeline): T.Task<void> =>
		isBlankPipeline(pipeline)
			? T.of(undefined)
			: pipe(
					T.fromIO(buildPipeline(pipeline)),
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

const runLine =
	(rl: Interface, home: string) =>
	(line: string): T.Task<void> =>
		pipe(
			parseLine(line, home),
			E.match(
				(err) =>
					T.fromIO(() => {
						console.error(err.message);
					}),
				runPipeline(rl),
			),
		);

// This is at the IO boundary so it is impure
const loop = async (rl: Interface, home: string): Promise<void> => {
	rl.prompt();
	for await (const line of rl) {
		await runLine(rl, home)(line)();
		rl.prompt();
	}
};

const main = async (): Promise<void> => {
	const completer = makeShellCompleter();
	const rl = makeReadline(completer)();
	const home = process.env.HOME ?? "~";
	await loop(rl, home);
};

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
