import test from "node:test";
import { pipe } from "fp-ts/lib/function";
import { findBuiltin, makeBuiltins } from "../../builtins";
import { jobs } from "../../builtins/jobs";
import { makeHistoryRef } from "../../histroy";
import { expectSome } from "../helpers";

test("jobs has the builtin type", () => {
	const commandFinder = pipe(makeHistoryRef(), makeBuiltins, findBuiltin);
	expectSome(commandFinder("jobs"), jobs);
});
