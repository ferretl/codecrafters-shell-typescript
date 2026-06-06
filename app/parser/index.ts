import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import * as RA from "fp-ts/ReadonlyArray";
import * as S from "fp-ts/string";
import type { CommandArgs } from "../commmandTypes";
import { type RedirectOptions, reduceTokens } from "./redirects";
import { tokenize } from "./tokenize";

export type { Redirect } from "./redirects";
export type ParseError = { message: string };
export type ParsedSegment = {
	name: string;
	args: CommandArgs;
	redirectOptions: RedirectOptions;
};
export type ParsedPipeline = {
	segments: ReadonlyArray<ParsedSegment>;
	background: boolean;
};

type Segments = ReadonlyArray<ReadonlyArray<string>>;
type SplitState = {
	current: ReadonlyArray<string>;
	segments: Segments;
};

const initialSplitState: SplitState = { current: [], segments: [] };

const splitOnPipe = (tokens: ReadonlyArray<string>): Segments =>
	pipe(
		tokens,
		RA.reduce(initialSplitState, (state, token) =>
			token === "|"
				? { current: [], segments: RA.append(state.current)(state.segments) }
				: {
						current: RA.append(token)(state.current),
						segments: state.segments,
					},
		),
		(state) => RA.append(state.current)(state.segments),
	);

const parseSegment = (
	tokens: ReadonlyArray<string>,
): E.Either<ParseError, ParsedSegment> => {
	const [name = "", ...rest] = tokens;
	const { args, pendingOperator, redirects } = reduceTokens(rest);
	return pipe(
		pendingOperator,
		O.match(
			() => E.right({ name, args, redirectOptions: redirects }),
			(operator) =>
				E.left({
					message: `syntax error: missing target for redirect '${operator}'`,
				}),
		),
	);
};

const validatePipeline = (
	segments: Segments,
): E.Either<ParseError, Segments> =>
	segments.length > 1 && segments.some(RA.isEmpty)
		? E.left({ message: "syntax error near unexpected token '|'" })
		: E.right(segments);

const AMPERSAND = "&";

type BackgroundSplit = {
	tokens: ReadonlyArray<string>;
	background: boolean;
};

const countAmpersands = (tokens: ReadonlyArray<string>): number =>
	pipe(
		tokens,
		RA.filter((token) => token === AMPERSAND),
		RA.size,
	);

const endsWithAmpersand = (tokens: ReadonlyArray<string>): boolean =>
	pipe(RA.last(tokens), O.elem(S.Eq)(AMPERSAND));

const splitBackground = (
	tokens: ReadonlyArray<string>,
): E.Either<ParseError, BackgroundSplit> =>
	countAmpersands(tokens) === 0
		? E.right({ tokens, background: false })
		: countAmpersands(tokens) === 1 &&
				endsWithAmpersand(tokens) &&
				tokens.length > 1
			? E.right({ tokens: RA.dropRight(1)(tokens), background: true })
			: E.left({ message: "syntax error near unexpected token '&'" });

export default (
	line: string,
	home: string,
): E.Either<ParseError, ParsedPipeline> =>
	pipe(
		tokenize(S.trim(line), home),
		splitBackground,
		E.chain(({ tokens, background }) =>
			pipe(
				tokens,
				splitOnPipe,
				validatePipeline,
				E.chain(RA.traverse(E.Applicative)(parseSegment)),
				E.map((segments) => ({ segments, background })),
			),
		),
	);
