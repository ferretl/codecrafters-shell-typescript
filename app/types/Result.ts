import * as O from 'fp-ts/lib/Option';

export const enum ResultTag {
  Output = 'Output',
  Exit = 'Exit'
}

export type CommandResult =
  | {
      _tag: ResultTag.Output;
      text: O.Option<string>;
      errorText: O.Option<string>;
    }
  | { _tag: ResultTag.Exit; code: number };

export const output = (
  text: O.Option<string>,
  errorText: O.Option<string> = O.none
): CommandResult => ({ _tag: ResultTag.Output, text, errorText });
