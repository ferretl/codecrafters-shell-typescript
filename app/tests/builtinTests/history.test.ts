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
	const ref = seed(["echo hello"])();
	await expectStdout(makeHistory(ref)([], empty()), "    1  echo hello\n");
});

test("history renders entries in insertion order with trailing newlines", async () => {
	const ref = seed([
		"echo hello",
		"echo world",
		"invalid_command",
		"history",
	])();
	await expectStdout(
		makeHistory(ref)([], empty()),
		"    1  echo hello\n    2  echo world\n    3  invalid_command\n    4  history\n",
	);
});

test("history right-pads multi-digit indices into the 5-char column", async () => {
	const entries = Array.from({ length: 10 }, (_, i) => `cmd${i + 1}`);
	const ref = seed(entries)();
	const expected =
		entries
			.map((line, i) => `${String(i + 1).padStart(5, " ")}  ${line}\n`)
			.join("");
	await expectStdout(makeHistory(ref)([], empty()), expected);
});

test("history reflects the ref's current state at invocation time", async () => {
	const ref = makeHistoryRef();
	const history = makeHistory(ref);
	pipe(
		ref.modify((h) => [...h, "echo hello"]),
		IO.chain(() => ref.modify((h) => [...h, "type cd"])),
	)();
	await expectStdout(
		history([], empty()),
		"    1  echo hello\n    2  type cd\n",
	);
});

test("history does not mutate the ref it reads from", async () => {
	const ref = seed(["pwd", "cd /tmp"])();
	const history = makeHistory(ref);
	await expectStdout(history([], empty()), "    1  pwd\n    2  cd /tmp\n");
	await expectStdout(history([], empty()), "    1  pwd\n    2  cd /tmp\n");
});
