import type { Command, CommandArgs, EvalResult } from '../types/Command';
import * as IOE from 'fp-ts/IOEither';

const parseExitCode = (errorCode: string | undefined): number =>
  errorCode === undefined
    ? 0
    : Number.isFinite(Number(errorCode))
      ? Number()
      : 0;

export const exit: Command<CommandArgs> = {
  eval: (args): EvalResult =>
    IOE.right({ _tag: 'Exit', code: parseExitCode(args[0]) })
};
