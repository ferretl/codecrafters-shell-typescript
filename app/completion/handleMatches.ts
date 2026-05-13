import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import * as RA from "fp-ts/ReadonlyArray";
import { type CompletionResult, CompletionTag } from "./CompletionResult";
import { longestCommonPrefix } from "./longestCommonPrefix";

const showMatches = (matches: ReadonlyArray<string>): CompletionResult => ({
	_tag: CompletionTag.ShowMatches,
	matches,
});

const partialOrShow = (
	matches: ReadonlyArray<string>,
	prefix: string,
	longestCommonPrefix: string,
): CompletionResult =>
	longestCommonPrefix.length > prefix.length
		? { _tag: CompletionTag.PartialComplete, value: longestCommonPrefix }
		: showMatches(matches);

const resolveMultiple = (
	matches: ReadonlyArray<string>,
	prefix: string,
): CompletionResult =>
	pipe(
		matches,
		longestCommonPrefix,
		O.match(
			() => showMatches(matches),
			(longestCommonPrefix) =>
				partialOrShow(matches, prefix, longestCommonPrefix),
		),
	);
enum MatchCategory {
	Empty = "empty",
	Single = "single",
	Many = "many",
}

const categorize = (matches: ReadonlyArray<string>): MatchCategory =>
	RA.isEmpty(matches)
		? MatchCategory.Empty
		: matches.length === 1
			? MatchCategory.Single
			: MatchCategory.Many;

const matchCategoryHandlers: Record<
	MatchCategory,
	(matches: ReadonlyArray<string>, prefix: string) => CompletionResult
> = {
	empty: () => ({ _tag: CompletionTag.NoMatch }),
	single: (matches) => ({ _tag: CompletionTag.Complete, value: matches[0] }),
	many: (matches, prefix) => resolveMultiple(matches, prefix),
};

export const handleMatches = (
	matches: ReadonlyArray<string>,
	prefix: string,
): CompletionResult =>
	matchCategoryHandlers[categorize(matches)](matches, prefix);
