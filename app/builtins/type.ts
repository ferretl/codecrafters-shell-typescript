import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import * as RA from "fp-ts/ReadonlyArray";
import { builtinCommand, type Command, empty, fromString, normal } from "../types";
import { findExecutable, isBuiltinName } from "./lookup";

const asBuiltin = (name: string) =>
	pipe(
		O.fromPredicate(isBuiltinName)(name),
		O.map(() => `${name} is a shell builtin`),
	);

const asExecutable = (name: string) =>
	pipe(
		findExecutable(name),
		O.map((dir) => `${name} is ${dir}/${name}`),
	);

const describeType = (name: string): string =>
	pipe(
		asBuiltin(name),
		O.alt(() => asExecutable(name)),
		O.getOrElse(() => `${name} not found`),
	);

export const type: Command = (args) =>
	pipe(
		RA.head(args),
		O.match(
			() => builtinCommand(empty(), fromString("No arguments given!\n"), normal),
			(name) =>
				builtinCommand(fromString(`${describeType(name)}\n`), empty(), normal),
		),
	);
