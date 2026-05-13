import * as IOE from "fp-ts/IOEither";
import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import * as RA from "fp-ts/ReadonlyArray";
import { type Command, ResultTag } from "../types";

const parseExitCode = (errorCode: string): number => {
	const parsed = Number(errorCode ?? 0);
	return Number.isFinite(parsed) ? parsed : 0;
};

export const exit: Command = (args) =>
	pipe(
		RA.head(args),
		O.getOrElse(() => "0"),
		parseExitCode,
		(code) => IOE.right({ _tag: ResultTag.Exit, code }),
	);
