import { pipe } from "fp-ts/lib/function";
import * as IOE from "fp-ts/lib/IOEither";
import * as O from "fp-ts/Option";
import * as RA from "fp-ts/ReadonlyArray";
import { type Command, output } from "../types";
import { findExecutable, isBuiltinName } from "./lookup";

export const type: Command = (args) =>
	pipe(
		RA.head(args),
		O.match(
			() => IOE.left({ message: "No arguments given!" }),
			(name) => {
				const text = pipe(
					O.fromPredicate(isBuiltinName)(name),
					O.map(() => `${name} is a shell builtin`),
					O.alt(() =>
						pipe(
							findExecutable(name),
							O.map((filePath) => `${name} is ${filePath}/${name}`),
						),
					),
					O.getOrElse(() => `${name} not found`),
				);
				return IOE.right(pipe(text, O.some, output));
			},
		),
	);
