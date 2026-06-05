import type { Readable } from "node:stream";
import type * as IO from "fp-ts/IO";
import type * as O from "fp-ts/Option";
import type { TaskEither } from "fp-ts/TaskEither";
import type { CommandError } from "./CommandError";
import type { CommandResult } from "./CommandResult";

export type CommandArgs = ReadonlyArray<string>;

export type StreamedCommand = {
	stdout: Readable;
	stderr: Readable;
	done: TaskEither<CommandError, CommandResult>;
	pid: O.Option<number>;
};

export type Command = (
	args: CommandArgs,
	stdin: Readable,
) => IO.IO<StreamedCommand>;
