import type * as IOE from "fp-ts/IOEither";
import type { CommandError } from "./Error";
import type { CommandResult } from "./Result";

export type CommandArgs = ReadonlyArray<string>;

export type IOEvalResult = IOE.IOEither<CommandError, CommandResult>;

export type Command = (args: CommandArgs) => IOEvalResult;
