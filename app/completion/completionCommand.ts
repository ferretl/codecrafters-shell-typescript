import { pipe } from "fp-ts/function";
import type * as IO from "fp-ts/IO";
import { newIORef } from "fp-ts/lib/IORef";
import * as O from "fp-ts/Option";
import * as RA from "fp-ts/ReadonlyArray";
import * as S from "fp-ts/string";
import { builtinNames } from "../builtins";
import { type CompletionResult, CompletionTag } from "./CompletionResult";
import { longestCommonPrefix } from "./longestCommonPrefix";

const splitPath = (input: string): { dirPart: string; readDir: string } => {
	const lastSlash = input.lastIndexOf("/");
	if (lastSlash === -1) return { dirPart: "", readDir: "." };
	const dirPart = input.slice(0, lastSlash + 1); // keeps trailing slash
	const readDir = dirPart === "/" ? "/" : dirPart.slice(0, -1);
	return { dirPart, readDir };
};

const completeFromCandidates =
	(candidates: ReadonlyArray<string>) =>
	(prefix: string): CompletionResult => {
		const matches = pipe(
			candidates,
			RA.filter(S.startsWith(prefix)),
			RA.uniq(S.Eq),
			RA.sort(S.Ord),
		);
		if (RA.isEmpty(matches)) return { _tag: CompletionTag.NoMatch };
		if (matches.length === 1)
			return { _tag: CompletionTag.Complete, value: matches[0] };

		return pipe(
			matches,
			longestCommonPrefix,
			O.match(
				() => ({ _tag: CompletionTag.ShowMatches, matches }),
				(longestCommonPrefix): CompletionResult =>
					longestCommonPrefix.length > prefix.length
						? {
								_tag: CompletionTag.PartialComplete,
								value: longestCommonPrefix,
							}
						: { _tag: CompletionTag.ShowMatches, matches },
			),
		);
	};

export const makeCompleteCommand = (executables: ReadonlyArray<string>) =>
	completeFromCandidates(
		[...builtinNames, ...executables].map((name) => `${name} `),
	);

export const makeCompleteArgument =
	(
		listFiles: (dir: string) => ReadonlyArray<string>,
		listDirectories: (dir: string) => ReadonlyArray<string>,
	) =>
	(input: string): CompletionResult => {
		const { dirPart, readDir } = splitPath(input);
		const fileCandidates = pipe(
			listFiles(readDir),
			RA.map((name) => `${dirPart}${name} `),
		);
		const dirCandidates = pipe(
			listDirectories(readDir),
			RA.map((name) => `${dirPart}${name}/`),
		);
		return completeFromCandidates([...fileCandidates, ...dirCandidates])(input);
	};

export const makeCompleter = (
	completeCommand: (prefix: string) => CompletionResult,
	completeArgument: (prefix: string) => CompletionResult,
	bell: IO.IO<void>,
	list: (matches: ReadonlyArray<string>, line: string) => IO.IO<void>,
): ((line: string) => [ReadonlyArray<string>, string]) => {
	const lastAmbiguousPrefix = newIORef("")();

	return (line) => {
		const lastSpace = line.lastIndexOf(" ");
		const inArgPosition = lastSpace !== -1;
		const prefix = inArgPosition ? line.slice(lastSpace + 1) : line;
		const result = inArgPosition
			? completeArgument(prefix)
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
