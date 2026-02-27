import * as IOE from 'fp-ts/IOEither';
import type { CommandResult } from './Result';
import type { CommandError } from './Error';
import type { Either } from 'fp-ts/lib/Either';

export type CommandArgs = ReadonlyArray<string>;

export type IOEvalResult = IOE.IOEither<CommandError, CommandResult>;
export type EvalResult = Either<CommandError, CommandResult>;

export type Command<CommandArgs> = {
  eval: (args: CommandArgs) => IOEvalResult;
};
