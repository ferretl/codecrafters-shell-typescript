import { appendFile, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import * as A from "fp-ts/Array";
import * as IO from "fp-ts/IO";
import { type IORef, newIORef } from "fp-ts/IORef";
import { pipe } from "fp-ts/lib/function";
import * as T from "fp-ts/Task";
import * as TE from "fp-ts/TaskEither";

const INITIAL_SAVED_COUNT = 0;

export type HistoryRef = {
	read: IO.IO<ReadonlyArray<string>>;
	append: (lines: ReadonlyArray<string>) => IO.IO<void>;
	readUnsaved: IO.IO<ReadonlyArray<string>>;
	markSaved: IO.IO<void>;
	seed: (lines: ReadonlyArray<string>) => IO.IO<void>;
};

const emptyHistory: string[] = [];

const expandHome = (path: string): string =>
	path.startsWith("~/") ? path.replace("~", homedir()) : path;

const defaultHistfile = `${homedir()}/.zsh_history`;

const getHistfilePath = (): string =>
	process.env.HISTFILE ? expandHome(process.env.HISTFILE) : defaultHistfile;

const stripZshMetadata = (line: string): string =>
	line.startsWith(": ") ? line.slice(line.indexOf(";") + 1) : line;

const readFileTE = (path: string): TE.TaskEither<Error, string> =>
	TE.tryCatch(
		() => readFile(path, "utf8"),
		(error) => (error instanceof Error ? error : new Error(String(error))),
	);

const appendFileTE = (
	path: string,
	lines: ReadonlyArray<string>,
): TE.TaskEither<Error, void> =>
	TE.tryCatch(
		() => appendFile(path, lines.length === 0 ? "" : `${lines.join("\n")}\n`),
		(error) => (error instanceof Error ? error : new Error(String(error))),
	);

export const appendHistoryLines = (
	lines: ReadonlyArray<string>,
): T.Task<void> =>
	pipe(
		appendFileTE(getHistfilePath(), lines),
		TE.getOrElse((err) =>
			T.fromIO(() => console.error(`failed to write history: ${err.message}`)),
		),
	);

export const readHistoryLines: T.Task<string[]> = pipe(
	getHistfilePath(),
	readFileTE,
	TE.map((contents): string[] =>
		pipe(
			contents.split("\n"),
			A.filter((line) => line.trim().length > 0),
			A.map(stripZshMetadata),
		),
	),
	TE.getOrElse(() => T.of(emptyHistory)),
);

const appendLines =
	(entries: IORef<ReadonlyArray<string>>) =>
	(lines: ReadonlyArray<string>): IO.IO<void> =>
		entries.modify((history) => [...history, ...lines]);

const readUnsaved = (
	entries: IORef<ReadonlyArray<string>>,
	watermark: IORef<number>,
): IO.IO<ReadonlyArray<string>> =>
	pipe(
		entries.read,
		IO.chain((history) =>
			pipe(
				watermark.read,
				IO.map((cursor) => history.slice(cursor)),
			),
		),
	);

const markSaved = (
	entries: IORef<ReadonlyArray<string>>,
	watermark: IORef<number>,
): IO.IO<void> =>
	pipe(
		entries.read,
		IO.chain((history) => watermark.write(history.length)),
	);

const seed =
	(entries: IORef<ReadonlyArray<string>>, watermark: IORef<number>) =>
	(lines: ReadonlyArray<string>): IO.IO<void> =>
		pipe(
			entries.modify((history) => [...history, ...lines]),
			IO.chain(() => entries.read),
			IO.chain((history) => watermark.write(history.length)),
		);

const buildHistoryRef = (
	entries: IORef<ReadonlyArray<string>>,
	watermark: IORef<number>,
): HistoryRef => ({
	read: entries.read,
	append: appendLines(entries),
	readUnsaved: readUnsaved(entries, watermark),
	markSaved: markSaved(entries, watermark),
	seed: seed(entries, watermark),
});

export const makeHistoryRef: IO.IO<HistoryRef> = pipe(
	newIORef<ReadonlyArray<string>>([]),
	IO.chain((entries) => {
		return pipe(
			newIORef<number>(INITIAL_SAVED_COUNT),
			IO.map((watermark) => buildHistoryRef(entries, watermark)),
		);
	}),
);
