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

const stepChar = (state: ParseState, char: string): ParseState => {
  const append = (s: string): ParseState => ({
    ...state,
    escaped: false,
    current: state.current + s
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
