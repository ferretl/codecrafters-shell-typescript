import * as fs from "node:fs";
import type { Readable, Writable } from "node:stream";
import * as IO from "fp-ts/IO";
import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import * as RA from "fp-ts/ReadonlyArray";
import type * as TE from "fp-ts/TaskEither";
import type { Dispatch } from "./dispatch";
import type { ParsedPipeline, ParsedSegment, Redirect } from "./parser";
import {
	type CommandError,
	type CommandResult,
	empty,
	type StreamedCommand,
} from "./commmandTypes";

type PipelineBuild = {
	nextStdin: Readable;
	completedTasks: ReadonlyArray<TE.TaskEither<CommandError, CommandResult>>;
};

const sinkForRedirect =
	(redirect: Redirect): IO.IO<Writable> =>
	() => {
		const stream = fs.createWriteStream(redirect.path, {
			flags: redirect.mode === "append" ? "a" : "w",
		});
		stream.on("error", (err) => {
			console.error(`${redirect.path}: ${err.message}`);
		});
		return stream;
	};

const pipeSource =
	(source: Readable, sink: Writable, endSink: boolean): IO.IO<void> =>
	() => {
		source.pipe(sink, { end: endSink });
	};

const wireStream = (
	source: Readable,
	redirect: O.Option<Redirect>,
	fallback: Writable,
): IO.IO<void> =>
	pipe(
		redirect,
		O.match(
			() => pipeSource(source, fallback, false),
			(r) =>
				pipe(
					sinkForRedirect(r),
					IO.chain((sink) => pipeSource(source, sink, true)),
				),
		),
	);

const writeToAndStop = (
	source: Readable,
	sink: Writable,
	endSink: boolean,
): IO.IO<Readable> => pipe(pipeSource(source, sink, endSink), IO.map(empty));

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
				pipe(
					sinkForRedirect(redirect),
					IO.chain((sink) => writeToAndStop(command.stdout, sink, true)),
				),
		),
	);

const startSegment = (
	dispatch: Dispatch,
	segment: ParsedSegment,
	stdin: Readable,
	isLastSegment: boolean,
): IO.IO<{ command: StreamedCommand; nextStdin: Readable }> =>
	pipe(
		dispatch(segment.name, segment.args, stdin),
		IO.chain((command) =>
			pipe(
				wireStream(
					command.stderr,
					segment.redirectOptions.stderr,
					process.stderr,
				),
				IO.chain(() => getNextStdin(segment, isLastSegment, command)),
				IO.map((nextStdin) => ({ command, nextStdin })),
			),
		),
	);

const buildPipelineReducer = (
	index: number,
	IOAccumulator: IO.IO<PipelineBuild>,
	segment: ParsedSegment,
	dispatch: Dispatch,
	pipeline: ParsedPipeline,
) =>
	pipe(
		IOAccumulator,
		IO.chain((state) =>
			pipe(
				startSegment(
					dispatch,
					segment,
					state.nextStdin,
					index === pipeline.length - 1,
				),
				IO.map(({ command, nextStdin }) => ({
					nextStdin,
					completedTasks: RA.append(command.done)(state.completedTasks),
				})),
			),
		),
	);

export const buildPipeline =
	(dispatch: Dispatch) =>
	(pipeline: ParsedPipeline): IO.IO<PipelineBuild> =>
		pipe(
			pipeline,
			RA.reduceWithIndex<ParsedSegment, IO.IO<PipelineBuild>>(
				IO.of({ nextStdin: empty(), completedTasks: [] }),
				(index, IOAccumulator, segment) =>
					buildPipelineReducer(
						index,
						IOAccumulator,
						segment,
						dispatch,
						pipeline,
					),
			),
		);
