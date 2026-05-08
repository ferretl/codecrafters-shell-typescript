import { pipe } from "fp-ts/lib/function";
import * as IOE from "fp-ts/lib/IOEither";
import * as O from "fp-ts/Option";
import * as RA from "fp-ts/ReadonlyArray";
import * as S from "fp-ts/string";
import { type Command, output } from "../types";

export const echo: Command = (args) =>
	IOE.right(pipe(RA.intercalate(S.Monoid)(" ")(args), O.some, output));
