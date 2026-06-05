import * as fs from "node:fs";
import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import * as IO from "fp-ts/IO";
import * as IOE from "fp-ts/IOEither";
import * as O from "fp-ts/Option";
import * as RA from "fp-ts/ReadonlyArray";
import * as S from "fp-ts/string";
import {
	builtinCommand,
	type Command,
	type CommandArgs,
	empty,
	fromString,
	normal,
	type StreamedCommand,
} from "../commmandTypes";
import type { HistoryRef } from "../histroyRef";

type HistoryAction =
	| { readonly _tag: "Print"; readonly limit: O.Option<number> }
	| { readonly _tag: "Read"; readonly filename: string }
	| { readonly _tag: "Write"; readonly filename: string }
	| { readonly _tag: "Append"; readonly filename: string };

const parseNumber = (input: string): O.Option<number> =>
	pipe(
		Number.parseInt(input, 10),
		O.fromPredicate((n) => !Number.isNaN(n)),
	);

const parseArgs = (args: CommandArgs): HistoryAction => {
	const [flag, filename] = args;
	if (filename !== undefined) {
		if (flag === "-r") return { _tag: "Read", filename };
		if (flag === "-w") return { _tag: "Write", filename };
		if (flag === "-a") return { _tag: "Append", filename };
	}
	return {
		_tag: "Print",
		limit: pipe(args, RA.head, O.flatMap(parseNumber)),
	};
};

const formatPrint = (
	entries: ReadonlyArray<string>,
	limit: O.Option<number>,
): string =>
	pipe(
		entries.map((line, i) => `${String(i + 1).padStart(5, " ")}  ${line}\n`),
		(formatted) =>
			O.isSome(limit) ? RA.takeRight(limit.value)(formatted) : formatted,
		RA.intercalate(S.Monoid)(""),
	);

const ok = (): StreamedCommand => builtinCommand(empty(), empty(), normal);

const errored = (message: string): StreamedCommand =>
	builtinCommand(empty(), fromString(`history: ${message}\n`), normal);

const printAction =
	(ref: HistoryRef, limit: O.Option<number>): IO.IO<StreamedCommand> =>
	() =>
		builtinCommand(fromString(formatPrint(ref.read(), limit)), empty(), normal);

const readFileSafe = (filename: string): IOE.IOEither<string, string> =>
	IOE.tryCatch(
		() => fs.readFileSync(filename, "utf8"),
		(err) => (err as Error).message,
	);

const readAction = (
	ref: HistoryRef,
	filename: string,
): IO.IO<StreamedCommand> =>
	pipe(
		readFileSafe(filename),
		IOE.tapIO((content) =>
			ref.append(content.split("\n").filter((l) => l.length > 0)),
		),
		IO.map(E.match(errored, ok)),
	);

const writeFileSafe = (
	entries: ReadonlyArray<string>,
	filename: string,
): IOE.IOEither<string, void> =>
	IOE.tryCatch(
		() => fs.writeFileSync(filename, `${entries.join("\n")}\n`),
		(e) => (e as Error).message,
	);

const writeAction = (
	ref: HistoryRef,
	filename: string,
): IO.IO<StreamedCommand> =>
	pipe(
		ref.read,
		IO.chain((entries) =>
			pipe(
				writeFileSafe(entries, filename),
				IOE.chainFirstIOK(() => ref.markSaved),
				IO.map(E.match(errored, ok)),
			),
		),
	);

const appendToFileSafe = (
	entries: ReadonlyArray<string>,
	filename: string,
): IOE.IOEither<string, void> =>
	IOE.tryCatch(
		() => {
			if (entries.length > 0) {
				fs.appendFileSync(filename, `${entries.join("\n")}\n`);
			}
		},
		(e) => (e as Error).message,
	);

const appendAction = (
	ref: HistoryRef,
	filename: string,
): IO.IO<StreamedCommand> =>
	pipe(
		ref.readUnsaved,
		IO.chain((unsaved) =>
			pipe(
				appendToFileSafe(unsaved, filename),
				IOE.chainFirstIOK(() => ref.markSaved),
				IO.map(E.match(errored, ok)),
			),
		),
	);

const dispatch = (
	action: HistoryAction,
	ref: HistoryRef,
): IO.IO<StreamedCommand> => {
	switch (action._tag) {
		case "Print":
			return printAction(ref, action.limit);
		case "Read":
			return readAction(ref, action.filename);
		case "Write":
			return writeAction(ref, action.filename);
		case "Append":
			return appendAction(ref, action.filename);
	}
};

export const makeHistory =
	(ref: HistoryRef): Command =>
	(args) =>
		dispatch(parseArgs(args), ref);
