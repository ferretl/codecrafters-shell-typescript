import { pipe } from "fp-ts/function";
import * as IO from "fp-ts/IO";
import * as S from "fp-ts/lib/string";
import * as O from "fp-ts/Option";
import * as RA from "fp-ts/ReadonlyArray";
import type { HistoryRef } from "../histroy";
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
	const formattedEntries = entries.map(
		(line, i) => `${String(i + 1).padStart(5, " ")}  ${line}\n`,
	);

	return pipe(
		O.isSome(historyLimit)
			? RA.takeRight(historyLimit.value)(formattedEntries)
			: formattedEntries,
		RA.intercalate(S.Monoid)(""),
	);
};

const convertToNumber = (input: O.Option<string>): O.Option<number> =>
	pipe(
		input,
		O.map((input) => parseInt(input, 10)),
		O.filter((parsedInput) => !Number.isNaN(parsedInput)),
	);

export const makeHistory =
	(ref: HistoryRef): Command =>
	(args) => {
		const historyLimit = pipe(args, RA.head, convertToNumber);
		return pipe(
			ref.read,
			IO.map((entries) =>
				builtinCommand(
					fromString(format(entries, historyLimit)),
					empty(),
					normal,
				),
			),
		);
	};
