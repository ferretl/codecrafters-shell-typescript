import * as IO from "fp-ts/IO";
import { pipe } from "fp-ts/lib/function";
import * as RA from "fp-ts/ReadonlyArray";
import {
	builtinCommand,
	type Command,
	empty,
	fromString,
	normal,
} from "../commmandTypes";
import type { Job, JobsRef } from "../jobsRef";

const STATUS_WIDTH = 24;

// Bash marks the most recent job with `+`, the previous one with `-`, and
// leaves the rest blank. Jobs are stored in start order, so the last entry is
// the most recent.
const markerFor = (index: number, total: number): string =>
	index === total - 1 ? "+" : index === total - 2 ? "-" : " ";

const formatJob = (job: Job, index: number, total: number): string =>
	`[${job.jobNumber}]${markerFor(index, total)}  ${"Running".padEnd(
		STATUS_WIDTH,
	)}${job.command}`;

const render = (jobs: ReadonlyArray<Job>): string =>
	RA.isEmpty(jobs)
		? ""
		: `${pipe(
				jobs,
				RA.mapWithIndex((index, job) => formatJob(job, index, jobs.length)),
			).join("\n")}\n`;

export const makeJobs =
	(jobsRef: JobsRef): Command =>
	() =>
		pipe(
			jobsRef.list,
			IO.map((jobs) =>
				builtinCommand(fromString(render(jobs)), empty(), normal),
			),
		);
