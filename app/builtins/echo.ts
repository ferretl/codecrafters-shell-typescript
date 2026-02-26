import * as IOE from 'fp-ts/lib/IOEither';
import type { Command, CommandArgs, EvalResult } from '../types/Command';

export const echo: Command<CommandArgs> = {
  eval: (args: CommandArgs): EvalResult =>
    IOE.right({ _tag: 'Output', text: args.join(' ') })
};
