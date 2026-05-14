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
import { completer } from "./completion";
import parseLine, { type ParsedContents, type Redirect } from "./parser";
import {
	type CommandArgs,
	type CommandResult,
	type ExitResult,
	type IOEvalResult,
	type OutputResult,
	output,
	ResultTag,
} from "./types";

const rl = createInterface({
	input: process.stdin,
	output: process.stdout,
	prompt: "$ ",
	completer,
});

rl.prompt();

const nonEmpty = (s: string): O.Option<string> =>
	S.isEmpty(s) ? O.none : O.some(s);

const createWriteableContent = (text: O.Option<string>) =>
	pipe(
		text,
		O.match(
			() => "",
			(s) => `${s}\n`,
		),
	);

export const runExecutable =
	(dir: string, name: string, args: CommandArgs): IOEvalResult =>
	() => {
		const result = spawnSync(`${dir}/${name}`, [...args], {
			argv0: name,
			encoding: "utf-8",
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

const writeToConsole =
	(text: O.Option<string>, fallback: (s: string) => void): IO.IO<void> =>
	() =>
		pipe(
			text,
			O.match(noop, (s) => fallback(s)),
		);

const writeToFile =
	({ path, mode }: Redirect, text: O.Option<string>): IO.IO<void> =>
	() => {
		const content = createWriteableContent(text);
		O.tryCatch(() =>
			fs.writeFileSync(path, content, {
				flag: mode === "append" ? "a" : "w",
			}),
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
			() => writeToConsole(text, fallback),
			(redirect) => writeToFile(redirect, text),
		),
	);

const dispatchCommand = (name: string, args: CommandArgs): IOEvalResult =>
	pipe(
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

const exitProgram =
	(result: ExitResult): IO.IO<void> =>
	() => {
		rl.close();
		process.exit(result.code);
	};

const handleOutput = (
	stdout: O.Option<Redirect>,
	result: OutputResult,
	stderr: O.Option<Redirect>,
): IO.IO<void> =>
	pipe(
		handleStream(stdout, result.text, console.log),
		IO.apSecond(handleStream(stderr, result.errorText, console.error)),
	);

const handleCommandResult =
	(stdout: O.Option<Redirect>, stderr: O.Option<Redirect>) =>
	(result: CommandResult): IO.IO<void> =>
		result._tag === ResultTag.Output
			? handleOutput(stdout, result, stderr)
			: exitProgram(result);

const noop: IO.IO<void> = () => {};

const logError =
	(err: { message: string }): IO.IO<void> =>
	() =>
		console.error(err.message);

const evalParsed = ({
	name,
	args,
	stdout,
	stderr,
}: ParsedContents): IO.IO<void> =>
	S.isEmpty(name)
		? noop
		: pipe(
				dispatchCommand(name, args),
				IOE.matchE(logError, handleCommandResult(stdout, stderr)),
			);

const runLine = (line: string): IO.IO<void> =>
	pipe(parseLine(line), E.match(logError, evalParsed));

rl.on("line", (line) => {
	runLine(line)();
	rl.prompt();
});
