import type { Option } from 'fp-ts/lib/Option';

export const enum ResultTag {
  Output = 'Output',
  Exit = 'Exit'
}

export type CommandResult =
  | { _tag: ResultTag.Output; text: Option<string> }
  | { _tag: ResultTag.Exit; code: number };
