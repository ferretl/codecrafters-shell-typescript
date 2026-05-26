import * as IO from "fp-ts/IO";
import { newIORef } from "fp-ts/IORef";
import { pipe } from "fp-ts/lib/function";

export type HistoryRef = {
	read: IO.IO<ReadonlyArray<string>>;
	append: (lines: ReadonlyArray<string>) => IO.IO<void>;
	readUnsaved: IO.IO<ReadonlyArray<string>>;
	markSaved: IO.IO<void>;
};

export const makeHistoryRef: IO.IO<HistoryRef> = pipe(
	newIORef<ReadonlyArray<string>>([]),
	IO.chain((entries) =>
		pipe(
			newIORef<number>(0),
			IO.map((watermark) => ({
				read: entries.read,
				append: (lines: ReadonlyArray<string>) =>
					entries.modify((history) => [...history, ...lines]),
				readUnsaved: pipe(
					entries.read,
					IO.chain((history) =>
						pipe(
							watermark.read,
							IO.map((cursor) => history.slice(cursor)),
						),
					),
				),
				markSaved: pipe(
					entries.read,
					IO.chain((history) => watermark.write(history.length)),
				),
			})),
		),
	),
);
