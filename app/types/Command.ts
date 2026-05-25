import type { Readable } from "node:stream";
import type * as IO from "fp-ts/IO";
import type { TaskEither } from "fp-ts/TaskEither";
import type { CommandError } from "./Error";
import type { CommandResult } from "./Result";

export type CommandArgs = ReadonlyArray<string>;

export type StreamedCommand = {
	stdout: Readable;
	stderr: Readable;
	done: TaskEither<CommandError, CommandResult>;
};

export type Command = (
	args: CommandArgs,
	stdin: Readable,
) => IO.IO<StreamedCommand>;
