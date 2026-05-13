import * as fs from "node:fs";
import path from "node:path";
import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import * as RA from "fp-ts/ReadonlyArray";
import * as S from "fp-ts/string";

const readDirSafe = (dir: string): ReadonlyArray<string> =>
	pipe(
		O.tryCatch(() => fs.readdirSync(dir)),
		O.getOrElse((): ReadonlyArray<string> => []),
	);

const isExecutable = (filePath: string): boolean =>
	pipe(
		O.tryCatch(() => fs.accessSync(filePath, fs.constants.X_OK)),
		O.isSome,
	);

const isFile = (filePath: string): boolean =>
	pipe(
		O.tryCatch(() => fs.statSync(filePath)),
		O.map((stats) => stats.isFile()),
		O.getOrElse(() => false),
	);

const isDirectory = (filePath: string): boolean =>
	pipe(
		O.tryCatch(() => fs.statSync(filePath)),
		O.map((stats) => stats.isDirectory()),
		O.getOrElse(() => false),
	);

const listExecutablesInDir = (dir: string): ReadonlyArray<string> =>
	pipe(
		readDirSafe(dir),
		RA.filter((name) => isExecutable(path.join(dir, name))),
	);

export const listFilesInDir = (
	dir: string = process.cwd(),
): ReadonlyArray<string> =>
	pipe(
		readDirSafe(dir),
		RA.filter((name) => isFile(path.join(dir, name))),
	);

export const listDirectoriesInDir = (
	dir: string = process.cwd(),
): ReadonlyArray<string> =>
	pipe(
		readDirSafe(dir),
		RA.filter((name) => isDirectory(path.join(dir, name))),
	);

export const listPathExecutables = (): ReadonlyArray<string> =>
	pipe(
		O.fromNullable(process.env.PATH),
		O.map((PATH) => PATH.split(path.delimiter)),
		O.getOrElse((): ReadonlyArray<string> => []),
		RA.chain(listExecutablesInDir),
		RA.uniq(S.Eq),
	);
