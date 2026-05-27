import * as IO from "fp-ts/IO";
import { pipe } from "fp-ts/lib/function";
import * as RA from "fp-ts/ReadonlyArray";
import * as S from "fp-ts/string";
import {
	builtinCommand,
	type Command,
	empty,
	fromString,
	normal,
} from "../commmandTypes";

export const echo: Command = (args) =>
	IO.of(
		builtinCommand(
			fromString(`${pipe(RA.intercalate(S.Monoid)(" ")(args))}\n`),
			empty(),
			normal,
		),
	);
