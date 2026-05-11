import fs from "node:fs";
import path from "node:path";
import * as A from "fp-ts/Array";
import { pipe } from "fp-ts/function";
import * as O from "fp-ts/Option";
import * as S from "fp-ts/string";
import { builtinNames } from "../builtins";
import { newIORef } from "fp-ts/lib/IORef";

const readDirSafe = (dir: string): string[] =>
	pipe(
		O.tryCatch(() => fs.readdirSync(dir)),
		O.getOrElse((): string[] => []),
	);

const isExecutable = (filePath: string): boolean =>
	pipe(
		O.tryCatch(() => fs.accessSync(filePath, fs.constants.X_OK)),
		O.isSome,
	);

const listExecutablesInDir = (dir: string): string[] =>
	pipe(
		readDirSafe(dir),
		A.filter((name) => isExecutable(path.join(dir, name))),
	);

const listPathExecutables = (): string[] =>
	pipe(
		O.fromNullable(process.env.PATH),
		O.map((PATH) => PATH.split(path.delimiter)),
		O.getOrElse((): string[] => []),
		A.chain(listExecutablesInDir),
	);

export const makeCompleteCommand =
	(executables: string[]) => (prefix: string) =>
		pipe(
			[...builtinNames, ...executables],
			A.filter(S.startsWith(prefix)),
			A.uniq(S.Eq),
			A.sort(S.Ord),
			A.map((name) => `${name} `),
		);

export const makeCompleter = (
	completeCommand: (prefix: string) => string[],
	bell: () => void,
	list: (matches: string[], line: string) => void,
): ((line: string) => [string[], string]) => {
	const lastAmbiguous = newIORef("")();

	return (line) => {
		const matches = completeCommand(line);

		if (A.isEmpty(matches)) {
			bell();
			lastAmbiguous.write("")();
			return [[], line];
		}

		if (matches.length === 1) {
			lastAmbiguous.write("")();
			return [matches, line];
		}

		// multiple matches
		if (lastAmbiguous.read() !== line) {
			// first tab on this prefix
			bell();
			lastAmbiguous.write(line)();
			return [[], line];
		}

		// second tab on the same prefix — print the list ourselves
		list(matches, line);
		lastAmbiguous.write("")();
		return [[], line];
	};
};

const cachedExecutables = listPathExecutables();

export const completeCommand = makeCompleteCommand(cachedExecutables);
export const completer = makeCompleter(
	completeCommand,
	() => process.stdout.write("\x07"),
	(matches, line) => {
		const formatted = matches.map((match) => match.trimEnd()).join("  ");
		process.stdout.write(`\n${formatted}\n$ ${line}`);
	},
);
