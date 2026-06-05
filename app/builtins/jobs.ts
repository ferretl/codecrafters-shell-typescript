import * as IO from "fp-ts/IO";
import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import * as RA from "fp-ts/ReadonlyArray";
import {
	builtinCommand,
	type Command,
	empty,
	fromString,
	normal,
} from "../commmandTypes";
import type { Job, JobsRef } from "../jobsRef";

const formatJob = (job: Job): string =>
	`[${job.jobNumber}] ${pipe(
		job.pid,
		O.match(
			() => "",
			(pid) => `${pid} `,
		),
	)}Running ${job.command}`;

const render = (jobs: ReadonlyArray<Job>): string =>
	RA.isEmpty(jobs) ? "" : `${pipe(jobs, RA.map(formatJob)).join("\n")}\n`;

export const makeJobs =
	(jobsRef: JobsRef): Command =>
	() =>
		pipe(
			jobsRef.list,
			IO.map((jobs) =>
				builtinCommand(fromString(render(jobs)), empty(), normal),
			),
		);
