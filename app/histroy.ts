import type { IO } from "fp-ts/IO";
import { newIORef } from "fp-ts/IORef";

export type HistoryRef = { read: IO<ReadonlyArray<string>> };

export const makeHistoryRef: IO<HistoryRef> = newIORef<ReadonlyArray<string>>(
	[],
);

export const fromReadlineHistory = (readlineHistory: string[]): HistoryRef => ({
	read: () => [...readlineHistory].reverse(),
});
