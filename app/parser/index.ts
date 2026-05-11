import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import type { CommandArgs } from "../types";
import { type Redirect, reduceTokens } from "./redirects";
import { tokenize } from "./tokenize";

export type { Redirect } from "./redirects";

export type ParseError = { message: string };

type ParsedContents = {
	name: string;
	args: CommandArgs;
	stdout: O.Option<Redirect>;
	stderr: O.Option<Redirect>;
};

type ParseResult = E.Either<ParseError, ParsedContents>;

export default (line: string): ParseResult => {
	const [name = "", ...tokens] = pipe(line.trim(), tokenize);
	const { args, pendingOperator, redirects } = pipe(tokens, reduceTokens);

	return pipe(
		pendingOperator,
		O.match(
			() =>
				E.right({
					name,
					args,
					stdout: redirects.stdout,
					stderr: redirects.stderr,
				}),
			(operator) =>
				E.left({
					message: `syntax error: missing target for redirect '${operator}'`,
				}),
		),
	);
};
