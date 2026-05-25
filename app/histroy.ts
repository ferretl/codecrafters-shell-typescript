import type { IO } from "fp-ts/IO";
import { type IORef, newIORef } from "fp-ts/IORef";

export type HistoryRef = IORef<ReadonlyArray<string>>;

export const makeHistoryRef: IO<HistoryRef> = newIORef<ReadonlyArray<string>>(
	[],
);
