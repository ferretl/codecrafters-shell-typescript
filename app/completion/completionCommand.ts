import fs from "node:fs";
import path from "node:path";
import { pipe } from "fp-ts/function";
import type * as IO from "fp-ts/IO";
import { newIORef } from "fp-ts/lib/IORef";
import * as O from "fp-ts/Option";
import * as RA from "fp-ts/ReadonlyArray";
import * as S from "fp-ts/string";
import { builtinNames } from "../builtins";
import { type CompletionResult, CompletionTag } from "./CompletionResult";
import { longestCommonPrefix } from "./longestCommonPrefix";

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

export const listPathExecutables = (): ReadonlyArray<string> =>
	pipe(
		O.fromNullable(process.env.PATH),
		O.map((PATH) => PATH.split(path.delimiter)),
		O.getOrElse((): ReadonlyArray<string> => []),
		RA.chain(listExecutablesInDir),
	);

export const makeCompleteCommand =
	(executables: ReadonlyArray<string>, files: ReadonlyArray<string>) =>
	(input: string): CompletionResult => {
		const matches = pipe(
			[...builtinNames, ...executables, ...files],
			RA.filter(S.startsWith(input)),
			RA.uniq(S.Eq),
			RA.sort(S.Ord),
			RA.map((name) => `${name} `),
		);
		if (RA.isEmpty(matches)) {
			return {
				_tag: CompletionTag.NoMatch,
			};
		}

		if (matches.length === 1) {
			return {
				_tag: CompletionTag.Complete,
				value: `${matches[0]}`,
			};
		}

		return pipe(
			matches,
			longestCommonPrefix,
			O.match(
				() => ({ _tag: CompletionTag.ShowMatches, matches }),
				(prefix: string): CompletionResult =>
					prefix.length > input.length
						? { _tag: CompletionTag.PartialComplete, value: prefix }
						: { _tag: CompletionTag.ShowMatches, matches },
			),
		);
	};
export const makeCompleter = (
	completeCommand: (prefix: string) => CompletionResult,
	bell: IO.IO<void>,
	list: (matches: ReadonlyArray<string>, line: string) => IO.IO<void>,
): ((line: string) => [ReadonlyArray<string>, string]) => {
	const lastAmbiguousLine = newIORef("")();

	return (line) => {
		const completionResult = completeCommand(line);

		switch (completionResult._tag) {
			case CompletionTag.NoMatch:
				bell();
				lastAmbiguousLine.write("")();
				return [[], line];

			case CompletionTag.Complete:
				lastAmbiguousLine.write("")();
				return [[completionResult.value], line];

			case CompletionTag.PartialComplete:
				lastAmbiguousLine.write("")();
				return [[completionResult.value], line]; // readline extends, no bell

			case CompletionTag.ShowMatches:
				if (lastAmbiguousLine.read() !== line) {
					bell(); // first tap
					lastAmbiguousLine.write(line)();
					return [[], line];
				}
				list(completionResult.matches, line)(); // second tap
				lastAmbiguousLine.write("")();
				return [[], line];
		}
	};
};
