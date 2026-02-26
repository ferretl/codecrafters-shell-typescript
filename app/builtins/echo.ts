import * as IOE from 'fp-ts/lib/IOEither';
import type { Command, CommandArgs, EvalResult } from '../types/Command';
import type { CommandError } from '../types/Error';
import type { CommandResult } from '../types/Result';

export const echo: Command<CommandArgs> = {
  eval: (args: CommandArgs): EvalResult =>
    IOE.right({ _tag: 'Output', text: args.join(' ') })
};
