export const enum ResultTag {
  Output = 'Output',
  Exit = 'Exit'
}

export type CommandResult =
  | { _tag: ResultTag.Output; text: string | null }
  | { _tag: ResultTag.Exit; code: number };
