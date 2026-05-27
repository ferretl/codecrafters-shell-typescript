import { expect, test } from "bun:test";
import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import { findBuiltin, makeBuiltins } from "../../builtins";
import { jobs } from "../../builtins/jobs";
import { makeHistoryRef } from "../../histroy";

test("jobs has the builtin type", () => {
	const builtinFinder = pipe(makeHistoryRef(), makeBuiltins, findBuiltin);
	expect(builtinFinder("jobs")).toBe(O.some(jobs));
});
