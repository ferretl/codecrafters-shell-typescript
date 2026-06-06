import { pipe } from "fp-ts/lib/function";
import * as RA from "fp-ts/ReadonlyArray";
import type { Job } from "./jobsRef";

const STATUS_WIDTH = 24;

const markerFor = (index: number, total: number): string =>
	index === total - 1 ? "+" : index === total - 2 ? "-" : " ";

const withoutTrailingAmpersand = (command: string): string =>
	command.replace(/\s*&\s*$/, "");

const displayCommand = (job: Job): string =>
	job.status === "Done" ? withoutTrailingAmpersand(job.command) : job.command;

const formatJob = (job: Job, index: number, total: number): string =>
	`[${job.jobNumber}]${markerFor(index, total)}  ${job.status.padEnd(
		STATUS_WIDTH,
	)}${displayCommand(job)}`;

export const renderJobs = (jobs: ReadonlyArray<Job>): string =>
	RA.isEmpty(jobs)
		? ""
		: `${pipe(
				jobs,
				RA.mapWithIndex((index, job) => formatJob(job, index, jobs.length)),
			).join("\n")}\n`;
