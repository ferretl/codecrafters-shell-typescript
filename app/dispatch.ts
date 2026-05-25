import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import type { Readable } from "node:stream";
import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import * as IO from "fp-ts/IO";
import * as O from "fp-ts/Option";
import type { TaskEither } from "fp-ts/TaskEither";
import { type CommandRegistry, findBuiltin, findExecutable } from "./builtins";
import {
	builtinCommand,
	type CommandArgs,
	type CommandError,
	type CommandResult,
	empty,
	fromString,
	normal,
	type StreamedCommand,
} from "./types";

const exitPromise = (
	child: ChildProcessWithoutNullStreams,
	name: string,
): Promise<E.Either<CommandError, CommandResult>> =>
	new Promise((resolve) => {
		child.once("error", (err) =>
			resolve(E.left({ message: `${name}: ${err.message}` })),
		);
		child.once("close", () => resolve(E.right(normal)));
	});

const captureExit =
	(
		child: ChildProcessWithoutNullStreams,
		name: string,
	): TaskEither<CommandError, CommandResult> =>
	() =>
		exitPromise(child, name);

const runExecutable =
	(
		dir: string,
		name: string,
		args: CommandArgs,
		stdin: Readable,
	): IO.IO<StreamedCommand> =>
	() => {
		const child = spawn(`${dir}/${name}`, [...args], { argv0: name });
		stdin.pipe(child.stdin);
		return {
			stdout: child.stdout,
			stderr: child.stderr,
			done: captureExit(child, name),
		};
	};

const commandNotFound = (name: string): IO.IO<StreamedCommand> =>
	IO.of(
		builtinCommand(empty(), fromString(`${name}: command not found\n`), normal),
	);

export type Dispatch = (
	name: string,
	args: CommandArgs,
	stdin: Readable,
) => IO.IO<StreamedCommand>;

export const dispatchCommand =
	(registry: CommandRegistry): Dispatch =>
	(name, args, stdin) =>
		pipe(
			findBuiltin(registry)(name),
			O.match(
				() =>
					pipe(
						findExecutable(name),
						IO.chain(
							O.match(
								() => commandNotFound(name),
								(dir) => runExecutable(dir, name, args, stdin),
							),
						),
					),
				(command) => command(args, stdin),
			),
		);
