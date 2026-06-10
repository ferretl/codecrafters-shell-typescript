import * as fs from "node:fs";
import path from "node:path";
import * as IO from "fp-ts/IO";
import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import * as RA from "fp-ts/ReadonlyArray";
import * as S from "fp-ts/string";

const readDirSafe =
	(dir: string): IO.IO<ReadonlyArray<string>> =>
	() =>
		pipe(
			O.tryCatch(() => fs.readdirSync(dir)),
			O.getOrElse((): ReadonlyArray<string> => []),
		);

const isExecutable =
	(filePath: string): IO.IO<boolean> =>
	() =>
		pipe(
			O.tryCatch(() => fs.accessSync(filePath, fs.constants.X_OK)),
			O.isSome,
		);

const isFile =
	(filePath: string): IO.IO<boolean> =>
	() =>
		pipe(
			O.tryCatch(() => fs.statSync(filePath)),
			O.match(
				() => false,
				(stats) => stats.isFile(),
			),
		);

const isDirectory =
	(filePath: string): IO.IO<boolean> =>
	() =>
		pipe(
			O.tryCatch(() => fs.statSync(filePath)),
			O.match(
				() => false,
				(stats) => stats.isDirectory(),
			),
		);

const listExecutablesInDir = (dir: string): IO.IO<ReadonlyArray<string>> =>
	pipe(
		readDirSafe(dir),
		IO.map(RA.filter((name) => isExecutable(path.join(dir, name))())),
	);

export const listFilesInDir = (dir: string): IO.IO<ReadonlyArray<string>> =>
	pipe(
		readDirSafe(dir),
		IO.map(RA.filter((name) => isFile(path.join(dir, name))())),
	);

export const listDirectoriesInDir = (
	dir: string,
): IO.IO<ReadonlyArray<string>> =>
	pipe(
		readDirSafe(dir),
		IO.map(RA.filter((name) => isDirectory(path.join(dir, name))())),
	);

export const listPathExecutables: IO.IO<ReadonlyArray<string>> = () =>
	pipe(
		O.fromNullable(process.env.PATH),
		O.match(
			() => [],
			(PATH) => PATH.split(path.delimiter),
		),
		RA.chain((dir) => listExecutablesInDir(dir)()),
		RA.uniq(S.Eq),
	);
