import type { Job } from "./jobsRef";

const STATUS_WIDTH = 24;

const withoutTrailingAmpersand = (command: string): string =>
	command.replace(/\s*&\s*$/, "");

const displayCommand = (job: Job): string =>
	job.status === "Done" ? withoutTrailingAmpersand(job.command) : job.command;

const markerFor = (job: Job, byRecency: ReadonlyArray<Job>): string =>
	job.jobNumber === byRecency[byRecency.length - 1]?.jobNumber
		? "+"
		: job.jobNumber === byRecency[byRecency.length - 2]?.jobNumber
			? "-"
			: " ";

const formatJob = (job: Job, byRecency: ReadonlyArray<Job>): string =>
	`[${job.jobNumber}]${markerFor(job, byRecency)}  ${job.status.padEnd(
		STATUS_WIDTH,
	)}${displayCommand(job)}`;

export const renderJobs = (jobs: ReadonlyArray<Job>): string =>
	jobs.length === 0
		? ""
		: `${[...jobs]
				.sort((a, b) => a.jobNumber - b.jobNumber)
				.map((job) => formatJob(job, jobs))
				.join("\n")}\n`;
