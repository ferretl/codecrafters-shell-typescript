import { pipe } from "fp-ts/function";
import * as O from "fp-ts/Option";
import * as RA from "fp-ts/ReadonlyArray";
import * as S from "fp-ts/String";

const commonPrefixOfTwo = (a: string, b: string): string => {
	const go = (index: number): number =>
		index < a.length && index < b.length && a[index] === b[index]
			? go(index + 1)
			: index;

	return a.slice(0, go(0));
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
		O.filter((p) => !S.isEmpty(p)),
	);
