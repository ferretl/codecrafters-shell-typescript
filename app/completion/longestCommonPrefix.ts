import { pipe } from "fp-ts/function";
import * as O from "fp-ts/Option";
import * as RA from "fp-ts/ReadonlyArray";
import * as S from "fp-ts/string";

const commonPrefixOfTwo = (
	firstString: string,
	secondString: string,
): string => {
	const commonPrefixOfTwoHelper = (index: number): number =>
		index < firstString.length &&
		index < secondString.length &&
		firstString[index] === secondString[index]
			? commonPrefixOfTwoHelper(index + 1)
			: index;

	return firstString.slice(0, commonPrefixOfTwoHelper(0));
};

export const longestCommonPrefix = (
	values: ReadonlyArray<string>,
): O.Option<string> =>
	pipe(
		RA.head(values),
		O.map((head) =>
			pipe(
				RA.tail(values),
				O.getOrElse((): ReadonlyArray<string> => []),
				RA.reduce(head, commonPrefixOfTwo),
			),
		),
		O.filter((prefix) => !S.isEmpty(prefix)),
	);
