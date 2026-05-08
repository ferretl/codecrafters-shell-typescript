import * as A from "fp-ts/Array";
import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import fs from "fs";
import path from "path";

export type FilePath = string;

export const builtinNames = ["cd", "echo", "exit", "pwd", "type"] as const;
export type BuiltinName = (typeof builtinNames)[number];

export const isBuiltinName = (name: string): name is BuiltinName =>
	(builtinNames as readonly string[]).includes(name);

const isExecutable = (filePath: string): boolean =>
	pipe(
		O.tryCatch(() => fs.accessSync(filePath, fs.constants.X_OK)),
		O.isSome,
	);

export const findExecutable = (fileName: string): O.Option<FilePath> =>
	pipe(
		O.fromNullable(process.env.PATH),
		O.map((p) => p.split(path.delimiter)),
		O.chain(A.findFirst((dir) => isExecutable(`${dir}/${fileName}`))),
	);
