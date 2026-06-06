import * as IO from "fp-ts/IO";
import { pipe } from "fp-ts/lib/function";
import {
	builtinCommand,
	type Command,
	empty,
	fromString,
	normal,
} from "../commmandTypes";
import type { JobsRef } from "../jobsRef";
import { renderJobs } from "../jobsView";

export const makeJobs =
	(jobsRef: JobsRef): Command =>
	() =>
		pipe(
			jobsRef.list,
			IO.chain((jobs) =>
				pipe(
					jobsRef.reapDone,
					IO.map(() =>
						builtinCommand(fromString(renderJobs(jobs)), empty(), normal),
					),
				),
			),
		);
