export type CommandResult =
  | { _tag: 'Output'; text: string }
  | { _tag: 'Exit'; code: number };
