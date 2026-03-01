import * as IOE from 'fp-ts/lib/IOEither';
import * as O from 'fp-ts/Option';
import type { Command, CommandArgs, IOEvalResult } from '../types/Command';
import { findBuiltin, findExecutable } from '.';
import { pipe } from 'fp-ts/lib/function';


export const type: Command<CommandArgs> = {
  eval: (args: CommandArgs): IOEvalResult => {
    const input = args[0];

    const text = pipe(
      pipe(
        findBuiltin(input),
        O.map(() => `${input} is a shell builtin`)
      ),
      O.alt(() => pipe(
        findExecutable(input),
        O.map((filePath) => `${input} is ${filePath}/${input}`)
      )),
      O.getOrElse(() => `${input}: not found`)
    );

    return IOE.right({
      _tag: 'Output',
      text
    });
  }
};
