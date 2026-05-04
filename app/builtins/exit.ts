import { pipe } from 'fp-ts/lib/function';
import {
  ResultTag,
  type Command,
  type CommandArgs,
  type IOEvalResult
} from '../types';
import * as IOE from 'fp-ts/IOEither';
import * as RA from 'fp-ts/ReadonlyArray';
import * as O from 'fp-ts/Option';

const parseExitCode = (errorCode: string | undefined): number => {
  const parsed = Number(errorCode ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const exit: Command<CommandArgs> = {
  eval: (args): IOEvalResult =>
    pipe(
      RA.head(args),
      O.getOrElse(() => '0'),
      parseExitCode,
      (code) => IOE.right({ _tag: ResultTag.Exit, code })
    )
};
