import { pipe } from "fp-ts/function";
import * as IO from "fp-ts/IO";
import type { HistoryRef } from "../histroy";
import * as RA from "fp-ts/ReadonlyArray";
import * as O from "fp-ts/Option";
import {
	builtinCommand,
	type Command,
	empty,
	fromString,
	normal,
} from "../types";

const format = (
	entries: ReadonlyArray<string>,
	historyLimit: O.Option<number>,
) => {
	const limitedEntries = O.isSome(historyLimit)
		? RA.takeRight(historyLimit.value)(entries)
		: entries;

	return limitedEntries
		.map((line, i) => `${String(i + 1).padStart(5, " ")}  ${line}\n`)
		.join("");
};

const convertToNumber = (input: O.Option<string>): O.Option<number> =>
	pipe(
		input,
		O.map(parseInt),
		O.fromPredicate((parsedInput) => !Number.isNaN(parsedInput)),
		O.flatten,
	);

export const makeHistory =
	(ref: HistoryRef): Command =>
	(args) => {
		const histroyLimit = pipe(args, RA.head, convertToNumber);
		return pipe(
			ref.read,
			IO.map((entries) =>
				builtinCommand(
					fromString(format(entries, histroyLimit)),
					empty(),
					normal,
				),
			),
		);
	};
