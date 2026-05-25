export * from "./Command";
export * from "./Error";
export * from "./Result";

import { Readable } from "node:stream";

export const fromString = (s: string): Readable => Readable.from([s]);
export const empty = (): Readable => Readable.from([]);
