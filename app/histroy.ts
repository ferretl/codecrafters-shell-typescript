import * as IO from "fp-ts/IO";
import { newIORef } from "fp-ts/IORef";
import { pipe } from "fp-ts/lib/function";

export type HistoryRef = {
	read: IO.IO<ReadonlyArray<string>>;
	append: (lines: ReadonlyArray<string>) => IO.IO<void>;
};

export const makeHistoryRef: IO.IO<HistoryRef> = pipe(
	newIORef<ReadonlyArray<string>>([]),
	IO.map((ref) => ({
		read: ref.read,
		append: (lines) => ref.modify((history) => [...history, ...lines]),
	})),
);

export const fromReadlineHistory = (readlineHistory: string[]): HistoryRef => ({
	read: () => [...readlineHistory].reverse(),
	append: (lines) => () => {
		readlineHistory.unshift(...[...lines].reverse());
	},
});
