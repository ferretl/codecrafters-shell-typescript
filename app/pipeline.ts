import * as fs from "node:fs";
import type { Readable, Writable } from "node:stream";
import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import * as RA from "fp-ts/ReadonlyArray";
import type * as TE from "fp-ts/TaskEither";
import { dispatchCommand } from "./main";
import type { ParsedPipeline, ParsedSegment, Redirect } from "./parser";
import type { CommandError, CommandResult, StreamedCommand } from "./types";
import { empty } from "./types";

type PipelineBuild = {
	nextStdin: Readable;
	dones: ReadonlyArray<TE.TaskEither<CommandError, CommandResult>>;
};

const sinkForRedirect = (r: Redirect): Writable =>
	fs.createWriteStream(r.path, { flags: r.mode === "append" ? "a" : "w" });

const wireStream = (
	source: Readable,
	redirect: O.Option<Redirect>,
	fallback: Writable,
): void =>
	pipe(
		redirect,
		O.match(
			() => {
				source.pipe(fallback);
			},
			(redirect) => {
				source.pipe(sinkForRedirect(redirect));
			},
		),
	);

const startSegment = (
	segment: ParsedSegment,
	stdin: Readable,
	isLastSegment: boolean,
): { cmd: StreamedCommand; nextStdin: Readable } => {
	const cmd = dispatchCommand(segment.name, segment.args, stdin);
	wireStream(cmd.stderr, segment.redirectOptions.stderr, process.stderr);

	const nextStdin = pipe(
		segment.redirectOptions.stdout,
		O.match(
			() => {
				if (isLastSegment) {
					cmd.stdout.pipe(process.stdout);
					return empty();
				}
				return cmd.stdout;
			},
			(r) => {
				cmd.stdout.pipe(sinkForRedirect(r));
				return empty();
			},
		),
	);

	return { cmd, nextStdin };
};

export const buildPipeline = (pipeline: ParsedPipeline): PipelineBuild =>
	pipe(
		pipeline,
		RA.reduceWithIndex<ParsedSegment, PipelineBuild>(
			{ nextStdin: empty(), dones: [] },
			(index, state, segment) => {
				const isLast = index === pipeline.length - 1;
				const { cmd, nextStdin } = startSegment(
					segment,
					state.nextStdin,
					isLast,
				);
				return { nextStdin, dones: RA.append(cmd.done)(state.dones) };
			},
		),
	);
