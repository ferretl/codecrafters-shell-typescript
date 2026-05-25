import fs from "node:fs";
import path from "node:path";
import * as A from "fp-ts/Array";
import type * as IO from "fp-ts/IO";
import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";

export type FilePath = string;

export const builtinNames = [
	"cd",
	"echo",
	"exit",
	"pwd",
	"type",
	"history",
] as const;
export type BuiltinName = (typeof builtinNames)[number];

export const isBuiltinName = (name: string): name is BuiltinName =>
	(builtinNames as ReadonlyArray<string>).includes(name);

const isExecutable =
	(filePath: string): IO.IO<boolean> =>
	() =>
		pipe(
			O.tryCatch(() => fs.accessSync(filePath, fs.constants.X_OK)),
			O.isSome,
		);

export const findExecutable =
	(fileName: string): IO.IO<O.Option<FilePath>> =>
	() =>
		pipe(
			O.fromNullable(process.env.PATH),
			O.map((p) => p.split(path.delimiter)),
			O.chain(A.findFirst((dir) => isExecutable(`${dir}/${fileName}`)())),
		);
