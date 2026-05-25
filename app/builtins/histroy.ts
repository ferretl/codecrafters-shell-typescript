import { pipe } from "fp-ts/function";
import * as IO from "fp-ts/IO";
import type { HistoryRef } from "../histroy";
import {
	builtinCommand,
	type Command,
	empty,
	fromString,
	normal,
} from "../types";

const format = (entries: ReadonlyArray<string>): string =>
	entries
		.map((line, i) => `${String(i + 1).padStart(5, " ")}  ${line}\n`)
		.join("");

export const makeHistory =
	(ref: HistoryRef): Command =>
	() =>
		pipe(
			ref.read,
			IO.map((entries) =>
				builtinCommand(fromString(format(entries)), empty(), normal),
			),
		);
