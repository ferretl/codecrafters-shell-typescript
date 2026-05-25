import { pipe } from "fp-ts/lib/function";
import * as RA from "fp-ts/ReadonlyArray";
import * as S from "fp-ts/string";
import * as TE from "fp-ts/TaskEither";
import { type Command, empty, fromString, normal } from "../types";

export const echo: Command = (args) => ({
	stdout: fromString(`${pipe(RA.intercalate(S.Monoid)(" ")(args))}\n`),
	stderr: empty(),
	done: TE.right(normal),
});
