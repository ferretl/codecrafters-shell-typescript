import type { Command } from '../types/Command';
import { cd } from './cd';
import { echo } from './echo';
import { pwd } from './pwd';
import { type } from './type';
import { exit } from './exit';

import * as O from 'fp-ts/Option';
import * as A from 'fp-ts/Array';
import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/lib/function';
import path from 'path';
import fs from 'fs';

export type CommandRegistry = Record<string, Command>;

export type FilePath = string;

export const builtins = {
  cd,
  echo,
  exit,
  pwd,
  type
} as const satisfies CommandRegistry;

export type BuiltinName = keyof typeof builtins;

const isBuiltinName = (name: string): name is BuiltinName => name in builtins;

export const findBuiltin = (name: string): O.Option<Command> =>
  isBuiltinName(name) ? O.some(builtins[name]) : O.none;

const isExecutable = (filePath: string): boolean =>
  pipe(
    O.tryCatch(() => fs.accessSync(filePath, fs.constants.X_OK)),
    O.isSome
  );

export const findExecutable = (fileName: string): O.Option<FilePath> =>
  pipe(
    O.fromNullable(process.env.PATH),
    O.map((p) => p.split(path.delimiter)),
    O.chain(A.findFirst((dir) => isExecutable(`${dir}/${fileName}`)))
  );
