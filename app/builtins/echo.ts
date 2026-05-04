import * as IOE from 'fp-ts/lib/IOEither';
import {
  ResultTag,
  type Command,
  type CommandArgs,
  type IOEvalResult
} from '../types';

export const echo: Command<CommandArgs> = {
  eval: (args: CommandArgs): IOEvalResult =>
    IOE.right({ _tag: ResultTag.Output, text: args.join(' ') })
};
