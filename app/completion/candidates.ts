import { pipe } from "fp-ts/lib/function";
import * as RA from "fp-ts/lib/ReadonlyArray";
import * as S from "fp-ts/lib/string";
import { builtinNames } from "../builtins";
import type { Completer, CompletionResult } from "./CompletionResult";
import { handleMatches } from "./handleMatches";

const splitPath = (input: string): { dirPart: string; readDir: string } => {
	const lastSlash = input.lastIndexOf("/");
	if (lastSlash === -1) return { dirPart: "", readDir: "." };
	const dirPart = input.slice(0, lastSlash + 1); // keeps trailing slash
	const readDir = dirPart === "/" ? "/" : dirPart.slice(0, -1);
	return { dirPart, readDir };
};
const completeFromCandidates =
	(candidates: ReadonlyArray<string>): Completer =>
	(prefix: string): CompletionResult => {
		const matches = pipe(
			candidates,
			RA.filter(S.startsWith(prefix)),
			RA.uniq(S.Eq),
			RA.sort(S.Ord),
		);
		return handleMatches(matches, prefix);
	};

export const makeCompleteCommand = (executables: ReadonlyArray<string>) =>
	completeFromCandidates(
		[...builtinNames, ...executables].map((name) => `${name} `),
	);
const listWithSuffix = (
	list: (dir: string) => ReadonlyArray<string>,
	dir: string,
	prefix: string,
	suffix: string,
): ReadonlyArray<string> =>
	pipe(
		list(dir),
		RA.map((name) => `${prefix}${name}${suffix}`),
	);
const buildArgumentCandidates = (
	dirPart: string,
	readDir: string,
	listFiles: (dir: string) => ReadonlyArray<string>,
	listDirectories: (dir: string) => ReadonlyArray<string>,
): ReadonlyArray<string> => [
	...listWithSuffix(listFiles, readDir, dirPart, " "),
	...listWithSuffix(listDirectories, readDir, dirPart, "/"),
];

export const makeCompleteArgument =
	(
		listFiles: (dir: string) => ReadonlyArray<string>,
		listDirectories: (dir: string) => ReadonlyArray<string>,
	): Completer =>
	(input: string): CompletionResult => {
		const { dirPart, readDir } = splitPath(input);
		const candidates = buildArgumentCandidates(
			dirPart,
			readDir,
			listFiles,
			listDirectories,
		);
		return completeFromCandidates(candidates)(input);
	};
