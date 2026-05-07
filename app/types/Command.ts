import * as IOE from 'fp-ts/IOEither';
import type { CommandResult } from './Result';
import type { CommandError } from './Error';

export type CommandArgs = ReadonlyArray<string>;

export type IOEvalResult = IOE.IOEither<CommandError, CommandResult>;

export type Command = (args: CommandArgs) => IOEvalResult;
