import * as IO from "fp-ts/IO";
import { type IORef, newIORef } from "fp-ts/IORef";
import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import * as RA from "fp-ts/ReadonlyArray";
import * as RNEA from "fp-ts/ReadonlyNonEmptyArray";

export type Job = {
	jobNumber: number;
	pid: O.Option<number>;
	command: string;
	status: "Running" | "Stopped" | "Done";
};

export type JobsRef = {
	add: (pid: O.Option<number>, command: string) => IO.IO<Job>;
	remove: (jobNumber: number) => IO.IO<void>;
	markDone: (jobNumber: number) => IO.IO<void>;
	reapDone: IO.IO<void>;
	list: IO.IO<ReadonlyArray<Job>>;
};

const lowestFreeJobNumber = (jobs: ReadonlyArray<Job>): number =>
	pipe(
		RNEA.range(1, jobs.length + 1),
		RA.findFirst(
			(candidate) => !jobs.some((job) => job.jobNumber === candidate),
		),
		O.getOrElse(() => jobs.length + 1),
	);

const addJob =
	(jobs: IORef<ReadonlyArray<Job>>) =>
	(pid: O.Option<number>, command: string): IO.IO<Job> =>
		pipe(
			jobs.read,
			IO.map(
				(current): Job => ({
					jobNumber: lowestFreeJobNumber(current),
					pid,
					command,
					status: "Running",
				}),
			),
			IO.chain((job) =>
				pipe(
					jobs.modify(RA.append(job)),
					IO.map(() => job),
				),
			),
		);

const removeJob =
	(jobs: IORef<ReadonlyArray<Job>>) =>
	(jobNumber: number): IO.IO<void> =>
		jobs.modify(RA.filter((job) => job.jobNumber !== jobNumber));

const markJobDone =
	(jobs: IORef<ReadonlyArray<Job>>) =>
	(jobNumber: number): IO.IO<void> =>
		jobs.modify(
			RA.map((job) =>
				job.jobNumber === jobNumber ? { ...job, status: "Done" as const } : job,
			),
		);

const reapDoneJobs = (jobs: IORef<ReadonlyArray<Job>>): IO.IO<void> =>
	jobs.modify(RA.filter((job) => job.status !== "Done"));

const buildJobsRef = (jobs: IORef<ReadonlyArray<Job>>): JobsRef => ({
	add: addJob(jobs),
	remove: removeJob(jobs),
	markDone: markJobDone(jobs),
	reapDone: reapDoneJobs(jobs),
	list: jobs.read,
});

export const makeJobsRef: IO.IO<JobsRef> = pipe(
	newIORef<ReadonlyArray<Job>>([]),
	IO.map(buildJobsRef),
);
