import * as IO from "fp-ts/IO";
import { type IORef, newIORef } from "fp-ts/IORef";
import { pipe } from "fp-ts/lib/function";

const INITIAL_SAVED_COUNT = 0;

export type HistoryRef = {
	read: IO.IO<ReadonlyArray<string>>;
	append: (lines: ReadonlyArray<string>) => IO.IO<void>;
	readUnsaved: IO.IO<ReadonlyArray<string>>;
	markSaved: IO.IO<void>;
};

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

const buildHistoryRef = (
	entries: IORef<ReadonlyArray<string>>,
	watermark: IORef<number>,
): HistoryRef => ({
	read: entries.read,
	append: appendLines(entries),
	readUnsaved: readUnsaved(entries, watermark),
	markSaved: markSaved(entries, watermark),
});

export const makeHistoryRef: IO.IO<HistoryRef> = pipe(
	newIORef<ReadonlyArray<string>>([]),
	IO.chain((entries) =>
		pipe(
			newIORef<number>(INITIAL_SAVED_COUNT),
			IO.map((watermark) => buildHistoryRef(entries, watermark)),
		),
	),
);
