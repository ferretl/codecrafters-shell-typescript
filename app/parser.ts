import { pipe } from 'fp-ts/lib/function';
import * as O from 'fp-ts/Option';
import * as RA from 'fp-ts/ReadonlyArray';
import { type CommandArgs } from './types';

const enum QuoteMode {
  None,
  Single,
  Double
}

type ParseState = {
  quoteMode: QuoteMode;
  escaped: boolean;
  current: string;
  args: ReadonlyArray<string>;
};

const initialState: ParseState = {
  quoteMode: QuoteMode.None,
  escaped: false,
  current: '',
  args: []
};

type RedirectKey = 'stdout' | 'stderr';
type RedirectMode = 'overwrite' | 'append';
type RedirectOperator = '>' | '1>' | '>>' | '1>>' | '2>' | '2>>';

export type Redirect = {
  path: string;
  mode: RedirectMode;
};

type TokenAccumulator = {
  args: CommandArgs;
  pendingOperator: O.Option<RedirectOperator>;
  redirects: Record<RedirectKey, O.Option<Redirect>>;
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

const operatorToRedirect = (
  operator: RedirectOperator
): { key: RedirectKey; mode: RedirectMode } => redirectMap[operator];

const stepChar = (state: ParseState, char: string): ParseState => {
  const append = (character: string): ParseState => ({
    ...state,
    escaped: false,
    current: state.current + character
  });

  const flush = (): ParseState => ({
    ...state,
    current: '',
    args: RA.append(state.current)(state.args)
  });

  const stepQuoted = (closeChar: string) => {
    return char === closeChar
      ? { ...state, quoteMode: QuoteMode.None }
      : append(char);
  };

  if (state.escaped && state.quoteMode === QuoteMode.None)
    return { ...state, escaped: false, current: state.current + char };

  if (state.escaped && state.quoteMode === QuoteMode.Double) {
    const specialChars = ['"', '\\'];
    return {
      ...state,
      escaped: false,
      current:
        state.current + (specialChars.includes(char) ? char : '\\' + char)
    };
  }

  if (state.quoteMode === QuoteMode.Single) return stepQuoted("'");
  if (state.quoteMode === QuoteMode.Double)
    return char === '\\' ? { ...state, escaped: true } : stepQuoted('"');

  switch (char) {
    case "'":
      return { ...state, escaped: false, quoteMode: QuoteMode.Single };
    case '"':
      return { ...state, escaped: false, quoteMode: QuoteMode.Double };
    case ' ':
    case '\t':
      return state.current ? flush() : state;
    case '\\':
      return { ...state, escaped: true };
    case '~':
      return append(state.current ? char : (process.env.HOME ?? '~'));
    default:
      return append(char);
  }
};

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
        const { key, mode } = operatorToRedirect(operator);
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

const parseArgs = (input: string): CommandArgs => {
  const { current, args } = pipe([...input], RA.reduce(initialState, stepChar));
  return pipe(
    O.fromPredicate((s: string) => s.length > 0)(current),
    O.match(
      () => args,
      (character) => RA.append(character)(args)
    )
  );
};

type parsedContents = {
  name: string;
  args: CommandArgs;
  stdout: O.Option<Redirect>;
  stderr: O.Option<Redirect>;
};

export default (line: string): parsedContents => {
  const [name = '', ...tokens] = parseArgs(line.trim());
  const { args, redirects } = pipe(
    tokens,
    RA.reduce(initialTokenAccum, stepToken)
  );

  return {
    name,
    args,
    stdout: redirects.stdout,
    stderr: redirects.stderr
  };
};
