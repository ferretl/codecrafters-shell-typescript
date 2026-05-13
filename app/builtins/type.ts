import { pipe } from "fp-ts/lib/function";
import * as IOE from "fp-ts/lib/IOEither";
import * as O from "fp-ts/Option";
import * as RA from "fp-ts/ReadonlyArray";
import { type Command, type IOEvalResult, output } from "../types";
import { findExecutable, isBuiltinName } from "./lookup";

const asBuiltin = (name: string) =>
	pipe(
		O.fromPredicate(isBuiltinName)(name),
		O.map(() => `${name} is a shell builtin`),
	);

const asExecutable = (name: string) =>
	pipe(
		findExecutable(name),
		O.map((filePath) => `${name} is ${filePath}/${name}`),
	);

const describeType = (name: string): IOEvalResult =>
	pipe(
		asBuiltin(name),
		O.alt(() => asExecutable(name)),
		O.getOrElse(() => `${name} not found`),
		(text) => IOE.right(pipe(text, O.some, output)),
	);

export const type: Command = (args) =>
	pipe(
		RA.head(args),
		O.match(() => IOE.left({ message: "No arguments given!" }), describeType),
	);
