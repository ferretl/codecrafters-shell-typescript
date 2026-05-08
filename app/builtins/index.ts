import type { Command } from '../types/Command';
import { cd } from './cd';
import { echo } from './echo';
import { pwd } from './pwd';
import { type } from './type';
import { exit } from './exit';
import * as O from 'fp-ts/Option';
import { isBuiltinName } from './lookup';

export type CommandRegistry = Record<string, Command>;

export const builtins = {
  cd,
  echo,
  exit,
  pwd,
  type
} as const satisfies CommandRegistry;

export const findBuiltin = (name: string): O.Option<Command> =>
  isBuiltinName(name) ? O.some(builtins[name]) : O.none;

export {
  builtinNames,
  findExecutable,
  isBuiltinName,
  type BuiltinName,
  type FilePath
} from './lookup';
