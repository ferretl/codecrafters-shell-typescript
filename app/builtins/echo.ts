import * as IOE from 'fp-ts/lib/IOEither';
import type { Command, CommandArgs, IOEvalResult } from '../types/Command';

export const echo: Command<CommandArgs> = {
  eval: (args: CommandArgs): IOEvalResult =>
    IOE.right({ _tag: 'Output', text: args.join(' ') })
};
