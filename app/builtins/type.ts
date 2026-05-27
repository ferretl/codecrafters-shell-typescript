import * as IO from "fp-ts/IO";
import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import * as RA from "fp-ts/ReadonlyArray";
import {
	builtinCommand,
	type Command,
	empty,
	fromString,
	normal,
} from "../commmandTypes";
import { findExecutable, isBuiltinName } from "./lookup";

const asBuiltin = (name: string): O.Option<string> =>
	pipe(
		O.fromPredicate(isBuiltinName)(name),
		O.map(() => `${name} is a shell builtin`),
	);

const asExecutable = (name: string): IO.IO<O.Option<string>> =>
	pipe(
		findExecutable(name),
		IO.map(O.map((dir) => `${name} is ${dir}/${name}`)),
	);

const describeType = (name: string): IO.IO<string> =>
	pipe(
		asBuiltin(name),
		O.match(
			() =>
				pipe(
					asExecutable(name),
					IO.map(O.getOrElse(() => `${name} not found`)),
				),
			IO.of,
		),
	);

export const type: Command = (args) =>
	pipe(
		RA.head(args),
		O.match(
			() =>
				IO.of(
					builtinCommand(empty(), fromString("No arguments given!\n"), normal),
				),
			(name) =>
				pipe(
					describeType(name),
					IO.map((desc) =>
						builtinCommand(fromString(`${desc}\n`), empty(), normal),
					),
				),
		),
	);
