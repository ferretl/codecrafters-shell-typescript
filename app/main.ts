import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import { createInterface } from "node:readline";
import * as E from "fp-ts/Either";
import * as IO from "fp-ts/IO";
import * as IOE from "fp-ts/IOEither";
import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import * as RA from "fp-ts/ReadonlyArray";
import * as S from "fp-ts/string";
import { findBuiltin, findExecutable } from "./builtins";
import { completer } from "./completion";
import parseLine, {
	type ParsedPipeline,
	type ParsedSegment,
	type Redirect,
} from "./parser";
import type { RedirectOptions } from "./parser/redirects";
import {
	type CommandArgs,
	type CommandError,
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
			(s) => (s.endsWith("\n") ? s : `${s}\n`),
		),
	);

export const runExecutable =
	(
		dir: string,
		name: string,
		args: CommandArgs,
		stdin: O.Option<string>,
	): IOEvalResult =>
	() => {
		const result = spawnSync(`${dir}/${name}`, [...args], {
			argv0: name,
			encoding: "utf-8",
			input: O.toUndefined(stdin),
		});

		return result.error
			? E.left({ message: `${name}: ${result.error.message}` })
			: E.right(output(nonEmpty(result.stdout), nonEmpty(result.stderr)));
	};

const writeToConsole =
	(text: O.Option<string>, fallback: (s: string) => void): IO.IO<void> =>
	() =>
		pipe(
			text,
			O.match(noop, (s) => fallback(s.endsWith("\n") ? s.slice(0, -1) : s)),
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

const forwardStdout = (
	redirect: O.Option<Redirect>,
	text: O.Option<string>,
): IOE.IOEither<never, O.Option<string>> =>
	pipe(
		redirect,
		O.match(
			() => IOE.right(text), // forward to next segment
			(r) =>
				pipe(
					writeToFile(r, text),
					IOE.fromIO,
					IOE.map(() => O.none),
				),
		),
	);

const runIntermediate =
	(segment: ParsedSegment) =>
	(stdin: O.Option<string>): IOE.IOEither<CommandError, O.Option<string>> =>
		pipe(
			dispatchCommand(segment.name, segment.args, stdin),
			IOE.chainW((result) =>
				result._tag === ResultTag.Exit
					? IOE.fromIO(
							pipe(
								exitProgram(result),
								IO.map(() => O.none),
							),
						)
					: pipe(
							IOE.fromIO(
								handleStream(
									segment.redirectOptions.stderr,
									result.errorText,
									console.error,
								),
							),
							IOE.chainW(() =>
								forwardStdout(segment.redirectOptions.stdout, result.text),
							),
						),
			),
		);

const runLast =
	(segment: ParsedSegment) =>
	(stdin: O.Option<string>): IO.IO<void> =>
		pipe(
			dispatchCommand(segment.name, segment.args, stdin),
			IOE.matchE(logError, handleCommandResult(segment.redirectOptions)),
		);

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

const dispatchCommand = (
	name: string,
	args: CommandArgs,
	stdin: O.Option<string>,
): IOEvalResult =>
	pipe(
		findBuiltin(name),
		O.match(
			() =>
				pipe(
					findExecutable(name),
					O.match(
						() => IOE.left({ message: `${name}: command not found` }),
						(dir) => runExecutable(dir, name, args, stdin),
					),
				),
			(command) => command(args, stdin),
		),
	);

const exitProgram =
	(result: ExitResult): IO.IO<void> =>
	() => {
		rl.close();
		process.exit(result.code);
	};

const handleOutput = (
	result: OutputResult,
	{ stdout, stderr }: RedirectOptions,
): IO.IO<void> =>
	pipe(
		handleStream(stdout, result.text, console.log),
		IO.apSecond(handleStream(stderr, result.errorText, console.error)),
	);

const handleCommandResult =
	(redirectOptions: RedirectOptions) =>
	(result: CommandResult): IO.IO<void> =>
		result._tag === ResultTag.Output
			? handleOutput(result, redirectOptions)
			: exitProgram(result);

const noop: IO.IO<void> = () => {};

const logError =
	(err: { message: string }): IO.IO<void> =>
	() =>
		console.error(err.message);

const executePipeline = (
	intermediates: ReadonlyArray<ParsedSegment>,
	lastSegment: ParsedSegment,
): IO.IO<void> =>
	pipe(
		intermediates,
		RA.reduce(
			IOE.right<CommandError, O.Option<string>>(O.none),
			(acc, segment) => pipe(acc, IOE.chainW(runIntermediate(segment))),
		),
		IOE.matchE(logError, runLast(lastSegment)),
	);

const evalPipeline = (pipeline: ParsedPipeline): IO.IO<void> =>
	pipe(
		RA.last(pipeline),
		O.match(
			() => noop,
			(lastSegment) =>
				pipeline.length === 1 && S.isEmpty(lastSegment.name)
					? noop
					: executePipeline(RA.dropRight(1)(pipeline), lastSegment),
		),
	);

const runLine = (line: string): IO.IO<void> =>
	pipe(parseLine(line), E.match(logError, evalPipeline));

rl.on("line", (line) => {
	runLine(line)();
	rl.prompt();
});
