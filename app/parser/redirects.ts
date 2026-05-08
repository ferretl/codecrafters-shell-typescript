import { pipe } from 'fp-ts/lib/function';
import * as O from 'fp-ts/Option';
import * as RA from 'fp-ts/ReadonlyArray';
import { type CommandArgs } from '../types';

type RedirectKey = 'stdout' | 'stderr';
type RedirectMode = 'overwrite' | 'append';
type RedirectOperator = '>' | '1>' | '>>' | '1>>' | '2>' | '2>>';

export type Redirect = {
  path: string;
  mode: RedirectMode;
};

export type RedirectMap = Record<RedirectKey, O.Option<Redirect>>;

type TokenAccumulator = {
  args: CommandArgs;
  pendingOperator: O.Option<RedirectOperator>;
  redirects: RedirectMap;
};

const initialTokenAccum: TokenAccumulator = {
  args: [],
  pendingOperator: O.none,
  redirects: { stdout: O.none, stderr: O.none }
};

const redirectMap: Record<
  RedirectOperator,
  { key: RedirectKey; mode: RedirectMode }
> = {
  '>': { key: 'stdout', mode: 'overwrite' },
  '1>': { key: 'stdout', mode: 'overwrite' },
  '>>': { key: 'stdout', mode: 'append' },
  '1>>': { key: 'stdout', mode: 'append' },
  '2>': { key: 'stderr', mode: 'overwrite' },
  '2>>': { key: 'stderr', mode: 'append' }
};

const isRedirectOperator = (token: string): token is RedirectOperator =>
  token in redirectMap;

const stepToken = (
  tokenAccumulator: TokenAccumulator,
  token: string
): TokenAccumulator =>
  pipe(
    tokenAccumulator.pendingOperator,
    O.match(
      () =>
        isRedirectOperator(token)
          ? { ...tokenAccumulator, pendingOperator: O.some(token) }
          : {
              ...tokenAccumulator,
              args: RA.append(token)(tokenAccumulator.args)
            },
      (operator) => {
        const { key, mode } = redirectMap[operator];
        return {
          ...tokenAccumulator,
          pendingOperator: O.none,
          redirects: {
            ...tokenAccumulator.redirects,
            [key]: O.some({ path: token, mode })
          }
        };
      }
    )
  );

export const reduceTokens = (tokens: ReadonlyArray<string>): TokenAccumulator =>
  pipe(tokens, RA.reduce(initialTokenAccum, stepToken));
