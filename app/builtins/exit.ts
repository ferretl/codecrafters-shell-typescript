import type {
  Command,
  CommandArgs,
  EvalResult,
  IOEvalResult
} from '../types/Command';
import * as IOE from 'fp-ts/IOEither';

const parseExitCode = (errorCode: string | undefined): number => {
  const parsed = Number(errorCode ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const exit: Command<CommandArgs> = {
  eval: (args): IOEvalResult =>
    IOE.right({ _tag: 'Exit', code: parseExitCode(args[0]) })
};
