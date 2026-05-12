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

const completeFromCandidates =
	(candidates: ReadonlyArray<string>) =>
	(prefix: string): CompletionResult => {
		const matches = pipe(
			candidates,
			RA.filter(S.startsWith(prefix)),
			RA.uniq(S.Eq),
			RA.sort(S.Ord),
			RA.map((name) => `${name} `),
		);
		if (RA.isEmpty(matches)) return { _tag: CompletionTag.NoMatch };
		if (matches.length === 1)
			return { _tag: CompletionTag.Complete, value: matches[0] };

		return pipe(
			matches,
			longestCommonPrefix,
			O.match(
				() => ({ _tag: CompletionTag.ShowMatches, matches }),
				(cp): CompletionResult =>
					cp.length > prefix.length
						? { _tag: CompletionTag.PartialComplete, value: cp }
						: { _tag: CompletionTag.ShowMatches, matches },
			),
		);
	};

export const makeCompleteCommand = (executables: ReadonlyArray<string>) =>
	completeFromCandidates([...builtinNames, ...executables]);

export const makeCompleteFile = (files: ReadonlyArray<string>) =>
	completeFromCandidates(files);

export const makeCompleter = (
	completeCommand: (prefix: string) => CompletionResult,
	completeFile: (prefix: string) => CompletionResult,
	bell: IO.IO<void>,
	list: (matches: ReadonlyArray<string>, line: string) => IO.IO<void>,
): ((line: string) => [ReadonlyArray<string>, string]) => {
	const lastAmbiguousPrefix = newIORef("")();

	return (line) => {
		const lastSpace = line.lastIndexOf(" ");
		const inArgPosition = lastSpace !== -1;
		const prefix = inArgPosition ? line.slice(lastSpace + 1) : line;
		const result = inArgPosition
			? completeFile(prefix)
			: completeCommand(prefix);

		switch (result._tag) {
			case CompletionTag.NoMatch:
				bell();
				lastAmbiguousPrefix.write("")();
				return [[], prefix];

			case CompletionTag.Complete:
				lastAmbiguousPrefix.write("")();
				return [[result.value], prefix];

			case CompletionTag.PartialComplete:
				lastAmbiguousPrefix.write("")();
				return [[result.value], prefix];

			case CompletionTag.ShowMatches:
				if (lastAmbiguousPrefix.read() !== prefix) {
					bell();
					lastAmbiguousPrefix.write(prefix)();
					return [[], prefix];
				}
				list(result.matches, line)();
				lastAmbiguousPrefix.write("")();
				return [[], prefix];
		}
	};
};
