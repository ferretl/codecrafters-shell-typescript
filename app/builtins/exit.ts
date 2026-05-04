import {
  ResultTag,
  type Command,
  type CommandArgs,
  type IOEvalResult
} from '../types';
import * as IOE from 'fp-ts/IOEither';

const parseExitCode = (errorCode: string | undefined): number => {
  const parsed = Number(errorCode ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const exit: Command<CommandArgs> = {
  eval: (args): IOEvalResult =>
    IOE.right({ _tag: ResultTag.Exit, code: parseExitCode(args[0]) })
};
