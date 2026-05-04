import * as IOE from 'fp-ts/lib/IOEither';
import {
  ResultTag,
  type Command,
  type CommandArgs,
  type IOEvalResult
} from '../types';
import * as RA from 'fp-ts/ReadonlyArray';
import * as S from 'fp-ts/string';
import { pipe } from 'fp-ts/lib/function';

export const echo: Command<CommandArgs> = {
  eval: (args: CommandArgs): IOEvalResult =>
    IOE.right({
      _tag: ResultTag.Output,
      text: RA.intercalate(S.Monoid)(' ')(args)
    })
};
