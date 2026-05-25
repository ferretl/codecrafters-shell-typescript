import { pipe } from "fp-ts/lib/function";
import * as RA from "fp-ts/ReadonlyArray";
import * as S from "fp-ts/string";
import { builtinCommand, type Command, empty, fromString, normal } from "../types";

export const echo: Command = (args) =>
	builtinCommand(
		fromString(`${pipe(RA.intercalate(S.Monoid)(" ")(args))}\n`),
		empty(),
		normal,
	);
