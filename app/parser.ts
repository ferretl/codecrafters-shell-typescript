import { pipe } from 'fp-ts/lib/function';
import * as O from 'fp-ts/Option';
import * as RA from 'fp-ts/ReadonlyArray';
import { type CommandArgs } from './types';

type ParseState = {
  inSingleQuote: boolean;
  inDoubleQuote: boolean;
  current: string;
  args: readonly string[];
};

const stepChar = (state: ParseState, char: string): ParseState => {
  const append = (s: string) => ({ ...state, current: state.current + s });
  const flush = () => ({
    ...state,
    current: '',
    args: [...state.args, state.current]
  });

  if (state.inSingleQuote)
    return char === "'" ? { ...state, inSingleQuote: false } : append(char);

  if (state.inDoubleQuote)
    return char === '"' ? { ...state, inDoubleQuote: false } : append(char);

  switch (char) {
    case "'":
      return { ...state, inSingleQuote: true };

    case '"':
      return { ...state, inDoubleQuote: true };

    case ' ':
    case '\t':
      return state.current ? flush() : state;

    case '~':
      return state.current ? append(char) : append(process.env.HOME ?? '~');

    default:
      return append(char);
  }
};

const parseArgs = (input: string): CommandArgs => {
  const { current, args } = pipe(
    [...input],
    RA.reduce(
      { inSingleQuote: false, inDoubleQuote: false, current: '', args: [] as readonly string[] },
      stepChar
    )
  );
  return current.length > 0 ? [...args, current] : args;
};

export const parseLine = (
  line: string
): { name: string; args: CommandArgs } => {
  const name = pipe(
    line.trim().split(/\s+/),
    RA.head,
    O.getOrElse(() => '')
  );
  return { name, args: parseArgs(line.trim().slice(name.length + 1)) };
};
