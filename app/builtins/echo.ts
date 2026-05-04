import * as IOE from 'fp-ts/lib/IOEither';
import {
  ResultTag,
  type Command,
  type CommandArgs,
  type IOEvalResult
} from '../types';
import * as RA from 'fp-ts/ReadonlyArray';
import * as S from 'fp-ts/string';
import * as O from 'fp-ts/Option';
import { pipe } from 'fp-ts/lib/function';

export const echo: Command = {
  eval: (args): IOEvalResult =>
    IOE.right({
      _tag: ResultTag.Output,
      text: pipe(RA.intercalate(S.Monoid)(' ')(args), O.some)
    })
};
