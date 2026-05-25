import type * as IOE from "fp-ts/IOEither";
import type { Option } from "fp-ts/lib/Option";
import type { CommandError } from "./Error";
import type { CommandResult } from "./Result";

export type CommandArgs = ReadonlyArray<string>;

export type IOEvalResult = IOE.IOEither<CommandError, CommandResult>;

export type Command = (
	args: CommandArgs,
	stdin: Option<string>,
) => IOEvalResult;
