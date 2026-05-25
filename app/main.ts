import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import type { Readable } from "node:stream";
import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import * as RA from "fp-ts/ReadonlyArray";
import * as T from "fp-ts/Task";
import * as TE from "fp-ts/TaskEither";
import { findBuiltin, findExecutable } from "./builtins";
import { completer } from "./completion";
import parseLine, { type ParsedPipeline } from "./parser";
import { buildPipeline } from "./pipeline";
import {
	type CommandArgs,
	type CommandError,
	type CommandResult,
	empty,
	fromString,
	normal,
	ResultTag,
	type StreamedCommand,
} from "./types";

const rl = createInterface({
	input: process.stdin,
	output: process.stdout,
	prompt: "$ ",
	completer,
});

rl.prompt();

export const runExecutable = (
	dir: string,
	name: string,
	args: CommandArgs,
	stdin: Readable,
): StreamedCommand => {
	const child = spawn(`${dir}/${name}`, [...args], { argv0: name });
	stdin.pipe(child.stdin);

	return {
		stdout: child.stdout,
		stderr: child.stderr,
		done: () =>
			new Promise((resolve) => {
				child.on("error", (err) =>
					resolve(E.left({ message: `${name}: ${err.message}` })),
				);
				child.on("close", () => resolve(E.right(normal)));
			}),
	};
};

const commandNotFound = (name: string): StreamedCommand => ({
	stdout: empty(),
	stderr: fromString(`${name}: command not found\n`),
	done: TE.right(normal),
});

export const dispatchCommand = (
	name: string,
	args: CommandArgs,
	stdin: Readable,
): StreamedCommand =>
	pipe(
		findBuiltin(name),
		O.match(
			() =>
				pipe(
					findExecutable(name),
					O.match(
						() => commandNotFound(name),
						(dir) => runExecutable(dir, name, args, stdin),
					),
				),
			(command) => command(args, stdin),
		),
	);

const handleShellExit = (result: CommandResult): void => {
	if (result._tag === ResultTag.Exit) {
		rl.close();
		process.exit(result.code);
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
				buildPipeline(pipeline).dones,
				T.sequenceArray,
				T.map((results) =>
					pipe(
						results,
						RA.last,
						O.match(() => undefined, handlePipelineFinal),
					),
				),
			);

const runLine = (line: string): T.Task<void> =>
	pipe(
		parseLine(line),
		E.match((err) => T.fromIO(() => console.error(err.message)), runPipeline),
	);

rl.on("line", async (line) => {
	await runLine(line)();
	rl.prompt();
});
