import * as E from "fp-ts/Either";
import * as IO from "fp-ts/IO";
import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import * as RA from "fp-ts/ReadonlyArray";
import { builtinCommand, type Command, empty, exitWith } from "../types";

const parseExitCode = (s: string): E.Either<string, number> => {
	const n = Number(s);
	return Number.isFinite(n) ? E.right(n) : E.left(`invalid exit code: ${s}`);
};

const resolveCode = (args: ReadonlyArray<string>): number =>
	pipe(
		RA.head(args),
		O.map(parseExitCode),
		O.getOrElse((): E.Either<string, number> => E.right(0)),
		E.getOrElse(() => 0),
	);

export const exit: Command = (args) =>
	IO.of(builtinCommand(empty(), empty(), exitWith(resolveCode(args))));
