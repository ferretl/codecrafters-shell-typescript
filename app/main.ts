import { createInterface } from "node:readline";
import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import * as RA from "fp-ts/ReadonlyArray";
import * as T from "fp-ts/Task";
import { completer } from "./completion";
import parseLine, { type ParsedPipeline } from "./parser";
import { buildPipeline } from "./pipeline";
import {
	type CommandError,
	type CommandResult,
	ResultTag,
} from "./types";

const rl = createInterface({
	input: process.stdin,
	output: process.stdout,
	prompt: "$ ",
	completer,
});

const handleShellExit = (result: CommandResult): void => {
	if (result._tag === ResultTag.Exit) {
		rl.close();
		setImmediate(() => process.exit(result.code));
	}
};

const handlePipelineFinal = (
	result: E.Either<CommandError, CommandResult>,
): void =>
	pipe(
		result,
		E.match((err) => console.error(err.message), handleShellExit),
	);

const isBlankPipeline = (pipeline: ParsedPipeline): boolean =>
	pipeline.length === 1 && pipeline[0].name === "";

const runPipeline = (pipeline: ParsedPipeline): T.Task<void> =>
	isBlankPipeline(pipeline)
		? T.of(undefined)
		: pipe(
				T.fromIO(buildPipeline(pipeline)),
				T.chain(({ dones }) =>
					pipe(
						dones,
						T.sequenceArray,
						T.map((results) =>
							pipe(
								results,
								RA.last,
								O.match(() => undefined, handlePipelineFinal),
							),
						),
					),
				),
			);

const runLine = (line: string): T.Task<void> =>
	pipe(
		parseLine(line),
		E.match((err) => T.fromIO(() => console.error(err.message)), runPipeline),
	);

const main = async (): Promise<void> => {
	rl.prompt();
	for await (const line of rl) {
		await runLine(line)();
		rl.prompt();
	}
};

main();
