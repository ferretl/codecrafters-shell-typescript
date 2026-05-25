import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import * as RA from "fp-ts/ReadonlyArray";
import { builtinCommand, type Command, empty, exitWith } from "../types";

const parseExitCode = (s: string): number => {
	const n = Number(s);
	return Number.isFinite(n) ? n : 0;
};

export const exit: Command = (args) =>
	builtinCommand(
		empty(),
		empty(),
		exitWith(
			pipe(
				RA.head(args),
				O.getOrElse(() => "0"),
				parseExitCode,
			),
		),
	);
