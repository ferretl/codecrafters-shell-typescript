import { pipe } from 'fp-ts/lib/function';
import * as O from 'fp-ts/Option';
import * as RA from 'fp-ts/ReadonlyArray';
import { type CommandArgs } from './types';

const enum QuoteMode {
  None = 'none',
  Single = 'single',
  Double = 'double'
}

type ParseState = {
  quoteMode: QuoteMode;
  current: string;
  args: readonly string[];
};

const initialState: ParseState = {
  quoteMode: QuoteMode.None,
  current: '',
  args: []
};

const stepChar = (state: ParseState, char: string): ParseState => {
  const append = (s: string): ParseState => ({
    ...state,
    current: state.current + s
  });
  const flush = (): ParseState => ({
    ...state,
    current: '',
    args: RA.append(state.current)(state.args)
  });

  if (state.quoteMode === 'single')
    return char === "'"
      ? { ...state, quoteMode: QuoteMode.None }
      : append(char);

  if (state.quoteMode === 'double')
    return char === '"'
      ? { ...state, quoteMode: QuoteMode.None }
      : append(char);

  switch (char) {
    case "'":
      return { ...state, quoteMode: QuoteMode.Single };
    case '"':
      return { ...state, quoteMode: QuoteMode.Double };
    case ' ':
    case '\t':
      return state.current ? flush() : state;
    case '~':
      return append(state.current ? char : (process.env.HOME ?? '~'));
    default:
      return append(char);
  }
};

const parseArgs = (input: string): CommandArgs => {
  const { current, args } = pipe([...input], RA.reduce(initialState, stepChar));
  return pipe(
    O.fromPredicate((s: string) => s.length > 0)(current),
    O.fold(
      () => args,
      (s) => RA.append(s)(args)
    )
  );
};

export const parseLine = (
  line: string
): { name: string; args: CommandArgs } => {
  const [name = '', ...args] = parseArgs(line.trim());
  return { name, args };
};
