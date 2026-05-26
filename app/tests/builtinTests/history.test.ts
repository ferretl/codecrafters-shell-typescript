import { test } from "bun:test";
import { pipe } from "fp-ts/function";
import * as IO from "fp-ts/IO";
import { makeHistory } from "../../builtins/histroy";
import type { HistoryRef } from "../../histroy";
import { empty } from "../../types";
import { expectStdout } from "../helpers";
import { newIORef } from "fp-ts/lib/IORef";

const seed = (entries: ReadonlyArray<string>): HistoryRef => ({
	read: () => entries,
});

test("history with no entries returns an empty stdout", async () => {
	await expectStdout(makeHistory(seed([]))([], empty()), "");
});

test("history with one entry renders a single indexed line", async () => {
	await expectStdout(
		makeHistory(seed(["echo hello"]))([], empty()),
		"    1  echo hello\n",
	);
});

test("history renders entries in insertion order with trailing newlines", async () => {
	const ref = seed(["echo hello", "echo world", "invalid_command", "history"]);
	await expectStdout(
		makeHistory(ref)([], empty()),
		"    1  echo hello\n    2  echo world\n    3  invalid_command\n    4  history\n",
	);
});

test("history right-pads multi-digit indices into the 5-char column", async () => {
	const entries = Array.from({ length: 10 }, (_, i) => `cmd${i + 1}`);
	const ref = seed(entries);
	const expected = entries
		.map((line, i) => `${String(i + 1).padStart(5, " ")}  ${line}\n`)
		.join("");
	await expectStdout(makeHistory(ref)([], empty()), expected);
});

test("history reflects the ref's current state at invocation time", async () => {
	const inner = newIORef<ReadonlyArray<string>>([])();
	const ref: HistoryRef = { read: inner.read };
	const history = makeHistory(ref);
	pipe(
		inner.modify((h) => [...h, "echo hello"]),
		IO.chain(() => inner.modify((h) => [...h, "type cd"])),
	)();
	await expectStdout(
		history([], empty()),
		"    1  echo hello\n    2  type cd\n",
	);
});

test("history does not mutate the ref it reads from", async () => {
	const ref = seed(["pwd", "cd /tmp"]);
	const history = makeHistory(ref);
	await expectStdout(history([], empty()), "    1  pwd\n    2  cd /tmp\n");
	await expectStdout(history([], empty()), "    1  pwd\n    2  cd /tmp\n");
});

test("history N shows only the last N entries with original indices", async () => {
	const ref = seed(["echo a", "echo b", "echo c", "echo d"]);
	await expectStdout(
		makeHistory(ref)(["2"], empty()),
		"    3  echo c\n    4  echo d\n",
	);
});

test("history N where N exceeds the entry count returns all entries", async () => {
	const ref = seed(["echo a", "echo b"]);
	await expectStdout(
		makeHistory(ref)(["10"], empty()),
		"    1  echo a\n    2  echo b\n",
	);
});

test("history 0 returns an empty stdout", async () => {
	const ref = seed(["echo a", "echo b"]);
	await expectStdout(makeHistory(ref)(["0"], empty()), "");
});

test("history with a non-numeric argument falls back to showing everything", async () => {
	const ref = seed(["echo a", "echo b"]);
	await expectStdout(
		makeHistory(ref)(["abc"], empty()),
		"    1  echo a\n    2  echo b\n",
	);
});

test("history only consults the first argument for the limit", async () => {
	const ref = seed(["echo a", "echo b", "echo c"]);
	await expectStdout(
		makeHistory(ref)(["1", "ignored", "9"], empty()),
		"    3  echo c\n",
	);
});
