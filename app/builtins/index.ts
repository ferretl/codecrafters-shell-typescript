import type { Command, CommandArgs } from '../types/Command';
import { echo } from './echo';
import { exit } from './exit';
import { type } from './type';

export type CommandName = string;

export type CommandRegistry = Record<CommandName, Command<CommandArgs>>;

export const builtins: CommandRegistry = {
  echo,
  exit,
  type
};
