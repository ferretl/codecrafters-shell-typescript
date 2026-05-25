import * as fs from "node:fs";
import type { Readable, Writable } from "node:stream";
import * as IO from "fp-ts/IO";
import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import * as RA from "fp-ts/ReadonlyArray";
import type * as TE from "fp-ts/TaskEither";
import { dispatchCommand } from "./dispatch";
import type { ParsedPipeline, ParsedSegment, Redirect } from "./parser";
import { type CommandError, type CommandResult, empty, type StreamedCommand } from "./types";

type PipelineBuild = {
	nextStdin: Readable;
	dones: ReadonlyArray<TE.TaskEither<CommandError, CommandResult>>;
};

const sinkForRedirect = (redirect: Redirect): Writable => {
	const stream = fs.createWriteStream(redirect.path, {
		flags: redirect.mode === "append" ? "a" : "w",
	});
	stream.on("error", (err) => {
		console.error(`${redirect.path}: ${err.message}`);
	});
	return stream;
};

const wireStream =
	(
		source: Readable,
		redirect: O.Option<Redirect>,
		fallback: Writable,
	): IO.IO<void> =>
	() =>
		pipe(
			redirect,
			O.match(
				() => {
					source.pipe(fallback, { end: false });
				},
				(redirect) => {
					source.pipe(sinkForRedirect(redirect));
				},
			),
		);

const writeToAndStop =
	(source: Readable, sink: Writable, endSink: boolean): IO.IO<Readable> =>
	() => {
		source.pipe(sink, { end: endSink });
		return empty();
	};

const getNextStdin = (
	segment: ParsedSegment,
	isLastSegment: boolean,
	command: StreamedCommand,
): IO.IO<Readable> =>
	pipe(
		segment.redirectOptions.stdout,
		O.match(
			() =>
				isLastSegment
					? writeToAndStop(command.stdout, process.stdout, false)
					: IO.of(command.stdout),
			(redirect) =>
				writeToAndStop(command.stdout, sinkForRedirect(redirect), true),
		),
	);

const startSegment =
	(
		segment: ParsedSegment,
		stdin: Readable,
		isLastSegment: boolean,
	): IO.IO<{ command: StreamedCommand; nextStdin: Readable }> =>
	() => {
		const cmd = dispatchCommand(segment.name, segment.args, stdin);
		wireStream(cmd.stderr, segment.redirectOptions.stderr, process.stderr)();
		const nextStdin = getNextStdin(segment, isLastSegment, cmd)();
		return { command: cmd, nextStdin };
	};

export const buildPipeline = (
	pipeline: ParsedPipeline,
): IO.IO<PipelineBuild> =>
	pipe(
		pipeline,
		RA.reduceWithIndex<ParsedSegment, IO.IO<PipelineBuild>>(
			IO.of({ nextStdin: empty(), dones: [] }),
			(index, accIO, segment) =>
				pipe(
					accIO,
					IO.chain((state) =>
						pipe(
							startSegment(
								segment,
								state.nextStdin,
								index === pipeline.length - 1,
							),
							IO.map(({ command, nextStdin }) => ({
								nextStdin,
								dones: RA.append(command.done)(state.dones),
							})),
						),
					),
				),
		),
	);
