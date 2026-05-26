import { expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { Readable } from "node:stream";
import { pipe } from "fp-ts/function";
import * as IO from "fp-ts/IO";
import { newIORef } from "fp-ts/lib/IORef";
import { makeHistory } from "../../builtins/histroy";
import { type HistoryRef, makeHistoryRef } from "../../histroy";
import { empty, type StreamedCommand } from "../../types";
import { expectStdout } from "../helpers";

const seed = (entries: ReadonlyArray<string>): HistoryRef => ({
	read: () => entries,
	append: () => () => {},
});

const writableSeed = (entries: ReadonlyArray<string>): HistoryRef => {
	const ref = makeHistoryRef();
	ref.append(entries)();
	return ref;
};

const readStderr = async (cmd: IO.IO<StreamedCommand>): Promise<string> =>
	(await (cmd().stderr as Readable).toArray()).join("");

const withTempFile = async (
	body: (filepath: string) => Promise<void>,
): Promise<void> => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "history-test-"));
	const filepath = path.join(dir, "history");
	try {
		await body(filepath);
	} finally {
		fs.rmSync(dir, { recursive: true, force: true });
	}
};

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
	const ref: HistoryRef = { read: inner.read, append: () => () => {} };
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

test("history -r reads lines from a file and appends them to in-memory history", async () => {
	await withTempFile(async (filepath) => {
		fs.writeFileSync(filepath, "echo a\necho b\necho c\n");
		const ref = writableSeed([]);
		await expectStdout(makeHistory(ref)(["-r", filepath], empty()), "");
		await expectStdout(
			makeHistory(ref)([], empty()),
			"    1  echo a\n    2  echo b\n    3  echo c\n",
		);
	});
});

test("history -r appends loaded entries after existing history", async () => {
	await withTempFile(async (filepath) => {
		fs.writeFileSync(filepath, "echo loaded\n");
		const ref = writableSeed(["echo existing"]);
		makeHistory(ref)(["-r", filepath], empty())();
		await expectStdout(
			makeHistory(ref)([], empty()),
			"    1  echo existing\n    2  echo loaded\n",
		);
	});
});

test("history -r skips blank lines in the file", async () => {
	await withTempFile(async (filepath) => {
		fs.writeFileSync(filepath, "echo a\n\necho b\n\n\n");
		const ref = writableSeed([]);
		makeHistory(ref)(["-r", filepath], empty())();
		await expectStdout(
			makeHistory(ref)([], empty()),
			"    1  echo a\n    2  echo b\n",
		);
	});
});

test("history -r against a missing file writes to stderr and leaves history alone", async () => {
	const ref = writableSeed(["echo existing"]);
	const stderr = await readStderr(
		makeHistory(ref)(["-r", "/nonexistent/history-file"], empty()),
	);
	expect(stderr).toContain("history:");
	await expectStdout(makeHistory(ref)([], empty()), "    1  echo existing\n");
});

test("history -w writes the in-memory history to a file", async () => {
	await withTempFile(async (filepath) => {
		const ref = seed(["echo a", "echo b", "echo c"]);
		await expectStdout(makeHistory(ref)(["-w", filepath], empty()), "");
		expect(fs.readFileSync(filepath, "utf8")).toBe("echo a\necho b\necho c\n");
	});
});

test("history -w overwrites existing file content", async () => {
	await withTempFile(async (filepath) => {
		fs.writeFileSync(filepath, "old content that should be replaced\n");
		const ref = seed(["echo new"]);
		makeHistory(ref)(["-w", filepath], empty())();
		expect(fs.readFileSync(filepath, "utf8")).toBe("echo new\n");
	});
});

test("history -a appends in-memory history to an existing file", async () => {
	await withTempFile(async (filepath) => {
		fs.writeFileSync(filepath, "echo earlier\n");
		const ref = seed(["echo later"]);
		await expectStdout(makeHistory(ref)(["-a", filepath], empty()), "");
		expect(fs.readFileSync(filepath, "utf8")).toBe(
			"echo earlier\necho later\n",
		);
	});
});

test("history -a creates the file if it does not exist", async () => {
	await withTempFile(async (filepath) => {
		const ref = seed(["echo a", "echo b"]);
		makeHistory(ref)(["-a", filepath], empty())();
		expect(fs.readFileSync(filepath, "utf8")).toBe("echo a\necho b\n");
	});
});

test("history -w against an unwritable path writes to stderr", async () => {
	const ref = seed(["echo a"]);
	const stderr = await readStderr(
		makeHistory(ref)(["-w", "/nonexistent/dir/history-file"], empty()),
	);
	expect(stderr).toContain("history:");
});
