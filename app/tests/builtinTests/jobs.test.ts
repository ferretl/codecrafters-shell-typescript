import { expect, test } from "bun:test";
import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import { findBuiltin, makeBuiltins } from "../../builtins";
import { makeJobs } from "../../builtins/jobs";
import { empty } from "../../commmandTypes";
import { makeHistoryRef } from "../../histroyRef";
import { type JobsRef, makeJobsRef } from "../../jobsRef";
import { expectStdout } from "../helpers";

const makeRegistry = (jobsRef: JobsRef) =>
	pipe(makeBuiltins(makeHistoryRef(), jobsRef), findBuiltin);

test("jobs is registered as a builtin", () => {
	const builtinFinder = makeRegistry(makeJobsRef());
	expect(O.isSome(builtinFinder("jobs"))).toBe(true);
});

test("jobs renders nothing when there are no jobs", async () => {
	await expectStdout(makeJobs(makeJobsRef())([], empty()), "");
});

test("jobs renders a job with its pid and command", async () => {
	const jobsRef = makeJobsRef();
	jobsRef.add(O.some(84470), "sleep 30")();
	await expectStdout(
		makeJobs(jobsRef)([], empty()),
		"[1] 84470 Running sleep 30\n",
	);
});

test("jobs omits the pid when there is none", async () => {
	const jobsRef = makeJobsRef();
	jobsRef.add(O.none, "echo hi")();
	await expectStdout(makeJobs(jobsRef)([], empty()), "[1] Running echo hi\n");
});

test("jobs numbers entries monotonically and reflects removals", async () => {
	const jobsRef = makeJobsRef();
	jobsRef.add(O.some(1), "sleep 1")();
	jobsRef.add(O.some(2), "sleep 2")();
	jobsRef.remove(1)();
	jobsRef.add(O.some(3), "sleep 3")();
	await expectStdout(
		makeJobs(jobsRef)([], empty()),
		"[2] 2 Running sleep 2\n[3] 3 Running sleep 3\n",
	);
});
