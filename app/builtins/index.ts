import * as O from "fp-ts/Option";
import type { HistoryRef } from "../histroyRef";
import type { Command } from "../commmandTypes/Command";
import { cd } from "./cd";
import { echo } from "./echo";
import { exit } from "./exit";
import { makeHistory } from "./history";
import { jobs } from "./jobs";
import { isBuiltinName } from "./lookup";
import { pwd } from "./pwd";
import { type } from "./type";

export type CommandRegistry = Record<string, Command>;

export const makeBuiltins = (historyRef: HistoryRef): CommandRegistry => ({
	cd,
	echo,
	exit,
	pwd,
	type,
	history: makeHistory(historyRef),
	jobs,
});

export const findBuiltin =
	(registry: CommandRegistry) =>
	(name: string): O.Option<Command> =>
		isBuiltinName(name) ? O.some(registry[name]) : O.none;

export {
	type BuiltinName,
	builtinNames,
	type FilePath,
	findExecutable,
	isBuiltinName,
} from "./lookup";
