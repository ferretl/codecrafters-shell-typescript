import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import * as RA from "fp-ts/ReadonlyArray";
import * as TE from "fp-ts/TaskEither";
import { type Command, empty, exitWith } from "../types";

const parseExitCode = (s: string): number => {
	const n = Number(s);
	return Number.isFinite(n) ? n : 0;
};

export const exit: Command = (args) => ({
	stdout: empty(),
	stderr: empty(),
	done: TE.right(
		exitWith(
			pipe(
				RA.head(args),
				O.getOrElse(() => "0"),
				parseExitCode,
			),
		),
	),
});
