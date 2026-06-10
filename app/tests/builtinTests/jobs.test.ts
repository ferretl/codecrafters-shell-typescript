import { expect, test } from "bun:test";
import * as O from "fp-ts/Option";
import { makeJobs } from "../../builtins/jobs";
import { empty } from "../../commmandTypes";
import { makeJobsRef } from "../../jobsRef";
import { expectBuiltin, expectStdout } from "../helpers";

test("jobs is registered as a builtin", () => expectBuiltin("jobs"));

const RUNNING = `Running${" ".repeat(17)}`;
const DONE = `Done${" ".repeat(20)}`;

test("jobs renders nothing when there are no jobs", async () => {
	await expectStdout(makeJobs(makeJobsRef())([], empty()), "");
});

test("jobs renders a single running job in bash format", async () => {
	const jobsRef = makeJobsRef();
	jobsRef.add(O.some(84470), "sleep 10 &")();
	await expectStdout(
		makeJobs(jobsRef)([], empty()),
		`[1]+  ${RUNNING}sleep 10 &\n`,
	);
});

test("jobs does not include the pid in the listing", async () => {
	const jobsRef = makeJobsRef();
	jobsRef.add(O.none, "echo hi")();
	await expectStdout(
		makeJobs(jobsRef)([], empty()),
		`[1]+  ${RUNNING}echo hi\n`,
	);
});

test("jobs marks the most recent job with + and the previous with -", async () => {
	const jobsRef = makeJobsRef();
	jobsRef.add(O.some(1), "sleep 1 &")();
	jobsRef.add(O.some(2), "sleep 2 &")();
	await expectStdout(
		makeJobs(jobsRef)([], empty()),
		`[1]-  ${RUNNING}sleep 1 &\n[2]+  ${RUNNING}sleep 2 &\n`,
	);
});

test("a new job recycles the lowest free number after one is removed", async () => {
	const jobsRef = makeJobsRef();
	jobsRef.add(O.some(1), "sleep 1 &")();
	jobsRef.add(O.some(2), "sleep 2 &")();
	jobsRef.remove(1)();
	const recycled = jobsRef.add(O.some(3), "sleep 3 &")();
	expect(recycled.jobNumber).toBe(1);
	await expectStdout(
		makeJobs(jobsRef)([], empty()),
		`[1]+  ${RUNNING}sleep 3 &\n[2]-  ${RUNNING}sleep 2 &\n`,
	);
});

test("jobs shows a finished job as Done without the trailing &", async () => {
	const jobsRef = makeJobsRef();
	jobsRef.add(O.some(84470), "sleep 1 &")();
	jobsRef.markDone(1)();
	await expectStdout(makeJobs(jobsRef)([], empty()), `[1]+  ${DONE}sleep 1\n`);
});

test("jobs reaps Done jobs so they vanish from the next call", async () => {
	const jobsRef = makeJobsRef();
	jobsRef.add(O.some(84470), "sleep 1 &")();
	jobsRef.markDone(1)();
	const jobsCmd = makeJobs(jobsRef);
	await expectStdout(jobsCmd([], empty()), `[1]+  ${DONE}sleep 1\n`);
	await expectStdout(jobsCmd([], empty()), "");
});

test("jobs keeps Running jobs while reaping only the Done ones", async () => {
	const jobsRef = makeJobsRef();
	jobsRef.add(O.some(1), "sleep 1 &")();
	jobsRef.add(O.some(2), "sleep 2 &")();
	jobsRef.markDone(1)();
	const jobsCmd = makeJobs(jobsRef);
	await expectStdout(
		jobsCmd([], empty()),
		`[1]-  ${DONE}sleep 1\n[2]+  ${RUNNING}sleep 2 &\n`,
	);
	await expectStdout(jobsCmd([], empty()), `[2]+  ${RUNNING}sleep 2 &\n`);
});
