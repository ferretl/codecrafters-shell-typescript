import * as IO from "fp-ts/IO";
import { type IORef, newIORef } from "fp-ts/IORef";
import { pipe } from "fp-ts/lib/function";
import type * as O from "fp-ts/Option";
import * as RA from "fp-ts/ReadonlyArray";

export type Job = {
	jobNumber: number;
	pid: O.Option<number>;
	command: string;
};

export type JobsRef = {
	add: (pid: O.Option<number>, command: string) => IO.IO<Job>;
	remove: (jobNumber: number) => IO.IO<void>;
	list: IO.IO<ReadonlyArray<Job>>;
};

const createAndStoreJob = (
	counter: IORef<number>,
	jobNumber: number,
	jobs: IORef<readonly Job[]>,
	pid: O.Option<number>,
	command: string,
): IO.IO<Job> =>
	pipe(
		counter.write(jobNumber),
		IO.chain(() =>
			jobs.modify((current) => RA.append({ jobNumber, pid, command })(current)),
		),
		IO.map((): Job => ({ jobNumber, pid, command })),
	);

const addJob =
	(jobs: IORef<ReadonlyArray<Job>>, counter: IORef<number>) =>
	(pid: O.Option<number>, command: string): IO.IO<Job> =>
		pipe(
			counter.read,
			IO.map((previous) => previous + 1),
			IO.chain((jobNumber) =>
				createAndStoreJob(counter, jobNumber, jobs, pid, command),
			),
		);

const removeJob =
	(jobs: IORef<ReadonlyArray<Job>>) =>
	(jobNumber: number): IO.IO<void> =>
		jobs.modify(RA.filter((job) => job.jobNumber !== jobNumber));

const buildJobsRef = (
	jobs: IORef<ReadonlyArray<Job>>,
	counter: IORef<number>,
): JobsRef => ({
	add: addJob(jobs, counter),
	remove: removeJob(jobs),
	list: jobs.read,
});

export const makeJobsRef: IO.IO<JobsRef> = pipe(
	newIORef<ReadonlyArray<Job>>([]),
	IO.chain((jobs) =>
		pipe(
			newIORef<number>(0),
			IO.map((counter) => buildJobsRef(jobs, counter)),
		),
	),
);
