import { test } from "bun:test";
import { pipe } from "fp-ts/function";
import * as IO from "fp-ts/IO";
import { makeHistory } from "../../builtins/histroy";
import { type HistoryRef, makeHistoryRef } from "../../histroy";
import { empty } from "../../types";
import { expectStdout } from "../helpers";

const seed =
	(entries: ReadonlyArray<string>): IO.IO<HistoryRef> =>
	() => {
		const ref = makeHistoryRef();
		ref.write(entries)();
		return ref;
	};

test("history with no entries returns an empty stdout", async () => {
	const ref = seed([])();
	await expectStdout(makeHistory(ref)([], empty()), "");
});

test("history with one entry renders a single indexed line", async () => {
	const ref = seed(["echo"])();
	await expectStdout(makeHistory(ref)([], empty()), "0 echo\n");
});

test("history renders entries in insertion order with trailing newlines", async () => {
	const ref = seed(["type", "echo", "history"])();
	await expectStdout(
		makeHistory(ref)([], empty()),
		"0 type\n1 echo\n2 history\n",
	);
});

test("history reflects the ref's current state at invocation time", async () => {
	const ref = makeHistoryRef();
	const history = makeHistory(ref);
	pipe(
		ref.modify((h) => [...h, "echo"]),
		IO.chain(() => ref.modify((h) => [...h, "type"])),
	)();
	await expectStdout(history([], empty()), "0 echo\n1 type\n");
});

test("history does not mutate the ref it reads from", async () => {
	const ref = seed(["pwd", "cd"])();
	const history = makeHistory(ref);
	await expectStdout(history([], empty()), "0 pwd\n1 cd\n");
	await expectStdout(history([], empty()), "0 pwd\n1 cd\n");
});
