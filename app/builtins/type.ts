import * as IOE from 'fp-ts/lib/IOEither';
import * as O from 'fp-ts/Option';
import type { Command, CommandArgs, IOEvalResult } from '../types/Command';
import { builtins } from '.';
import { pipe } from 'fp-ts/lib/function';

export const type: Command<CommandArgs> = {
  eval: (args: CommandArgs): IOEvalResult => {
    const command = args[0];
    return IOE.right({
      _tag: 'Output',
      text: pipe(
        O.fromNullable(builtins[command]),
        O.match(
          () => `${command}: not found`,
          () => `${command} is a shell builtin`
        )
      )
    });
  }
};
