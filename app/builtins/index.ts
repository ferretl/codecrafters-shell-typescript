import * as O from "fp-ts/Option";
import type { Command } from "../types/Command";
import { cd } from "./cd";
import { echo } from "./echo";
import { exit } from "./exit";
import { isBuiltinName } from "./lookup";
import { pwd } from "./pwd";
import { type } from "./type";

export type CommandRegistry = Record<string, Command>;

export const builtins = {
	cd,
	echo,
	exit,
	pwd,
	type,
} as const satisfies CommandRegistry;

export const findBuiltin = (name: string): O.Option<Command> =>
	isBuiltinName(name) ? O.some(builtins[name]) : O.none;

export {
	type BuiltinName,
	builtinNames,
	type FilePath,
	findExecutable,
	isBuiltinName,
} from "./lookup";
