import type { Command, CommandArgs } from '../types/Command';
import { echo } from './echo';
import { exit } from './exit';
import { type } from './type';
import * as O from 'fp-ts/Option';
import * as A from 'fp-ts/Array';
import { pipe } from 'fp-ts/lib/function';
import path from 'path';
import fs from 'fs';

export type CommandName = string;

export type CommandRegistry = Record<CommandName, Command<CommandArgs>>;

export const builtins: CommandRegistry = {
  echo,
  exit,
  type
};

export const findBuiltin = (input: string): O.Option<Command<CommandArgs>> =>
  O.fromNullable(builtins[input]);

export const findExecutable = (input: string): O.Option<string> =>
  pipe(
    O.fromNullable(process.env.PATH),
    O.map((pathContents) => pathContents.split(path.delimiter)),
    O.chain(
      A.findFirst((filePath) =>
        O.isSome(
          O.tryCatch(() => {
            fs.accessSync(`${filePath}/${input}`, fs.constants.X_OK);
          })
        )
      )
    )
  );
