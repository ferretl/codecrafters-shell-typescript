import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import { createInterface } from "node:readline";
import * as E from "fp-ts/Either";
import * as IO from "fp-ts/IO";
import * as IOE from "fp-ts/IOEither";
import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import * as S from "fp-ts/string";
import { findBuiltin, findExecutable } from "./builtins";
import parseLine, { type Redirect } from "./parser";
import {
	type CommandArgs,
	type IOEvalResult,
	output,
	ResultTag,
} from "./types";

const rl = createInterface({
	input: process.stdin,
	output: process.stdout,
	prompt: "$ ",
});

rl.prompt();

const nonEmpty = (s: string): O.Option<string> =>
	S.isEmpty(s) ? O.none : O.some(s);

export const runExecutable =
	(dir: string, name: string, args: CommandArgs): IOEvalResult =>
	() => {
		const result = spawnSync(`${dir}/${name}`, [...args], {
			argv0: name,
			encoding: "utf-8",
			stdio: ["pipe", "pipe", "pipe"],
		});
		return result.error
			? E.left({ message: `${name}: ${result.error.message}` })
			: E.right(
					output(
						nonEmpty(result.stdout.trimEnd()),
						nonEmpty(result.stderr.trimEnd()),
					),
				);
	};

const handleStream = (
	redirect: O.Option<Redirect>,
	text: O.Option<string>,
	fallback: (s: string) => void,
): IO.IO<void> =>
	pipe(
		redirect,
		O.match(
			(): IO.IO<void> =>
				pipe(
					text,
					O.match(
						() => () => {},
						(s) => () => fallback(s),
					),
				),
			({ path, mode }) =>
				() => {
					const content = pipe(
						text,
						O.match(
							() => "",
							(s) => `${s}\n`,
						),
					);
					fs.writeFileSync(path, content, {
						flag: mode === "append" ? "a" : "w",
					});
				},
		),
	);

rl.on("line", (line) => {
	const parsed = parseLine(line);
	if (parsed._tag === "Left") {
		console.error(parsed.left.message);
		return rl.prompt();
	}
	const { name, args, stdout, stderr } = parsed.right;
	if (S.isEmpty(name)) return rl.prompt();

	const dispatch: IOEvalResult = pipe(
		findBuiltin(name),
		O.match(
			() =>
				pipe(
					findExecutable(name),
					O.match(
						() => IOE.left({ message: `${name}: command not found` }),
						(dir) => runExecutable(dir, name, args),
					),
				),
			(command) => command(args),
		),
	);

	const program: IO.IO<void> = pipe(
		dispatch,
		IOE.matchE(
			(err) => () => console.error(err.message),
			(result) => {
				switch (result._tag) {
					case ResultTag.Output:
						return pipe(
							handleStream(stdout, result.text, console.log),
							IO.apSecond(
								handleStream(stderr, result.errorText, console.error),
							),
						);
					case ResultTag.Exit:
						return () => {
							rl.close();
							process.exit(result.code);
						};
				}
			},
		),
	);

	program();
	rl.prompt();
});
