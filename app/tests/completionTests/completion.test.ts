import { describe, expect, mock, test } from "bun:test";
import { CompletionTag } from "../../completion/CompletionResult";
import {
	makeCompleteArgument,
	makeCompleteCommand,
	makeCompleter,
} from "../../completion/completionCommand";

describe("completeCommand", () => {
	const completeCommand = makeCompleteCommand([]);

	test("returns Complete for a unique builtin prefix", () => {
		expect(completeCommand("ec")).toEqual({
			_tag: CompletionTag.Complete,
			value: "echo ",
		});
	});

	test("returns ShowMatches when matches share no prefix beyond input", () => {
		expect(completeCommand("e")).toEqual({
			_tag: CompletionTag.ShowMatches,
			matches: ["echo ", "exit "],
		});
	});

	test("returns PartialComplete when LCP extends past input", () => {
		const completer = makeCompleteCommand(["custom_a", "custom_b"]);
		expect(completer("cu")).toEqual({
			_tag: CompletionTag.PartialComplete,
			value: "custom_",
		});
	});

	test("returns ShowMatches for empty prefix, sorted", () => {
		expect(completeCommand("")).toEqual({
			_tag: CompletionTag.ShowMatches,
			matches: ["cd ", "echo ", "exit ", "pwd ", "type "],
		});
	});

	test("returns NoMatch for an unknown prefix", () => {
		expect(completeCommand("xyz")).toEqual({ _tag: CompletionTag.NoMatch });
	});

	test("includes PATH executables in matches alongside builtins", () => {
		const completer = makeCompleteCommand(["custom_executable"]);
		expect(completer("c")).toEqual({
			_tag: CompletionTag.ShowMatches,
			matches: ["cd ", "custom_executable "],
		});
	});

	test("deduplicates when builtin and PATH share a name", () => {
		const completer = makeCompleteCommand(["echo"]);
		expect(completer("echo")).toEqual({
			_tag: CompletionTag.Complete,
			value: "echo ",
		});
	});
});

describe("completeFile", () => {
	test("completes a file in the current directory", () => {
		const listFiles = (dir: string) =>
			dir === "." ? ["completion.ts", "main.ts"] : [];
		const completeFile = makeCompleteArgument(listFiles, () => []);

		expect(completeFile("compl")).toEqual({
			_tag: CompletionTag.Complete,
			value: "completion.ts ",
		});
	});

	test("completes a file in a subdirectory", () => {
		const listFiles = (dir: string) =>
			dir === "src" ? ["completion", "main.ts"] : [];
		const completeFile = makeCompleteArgument(listFiles, () => []);

		expect(completeFile("src/comp")).toEqual({
			_tag: CompletionTag.Complete,
			value: "src/completion ",
		});
	});

	test("completes a file in an absolute path", () => {
		const listFiles = (dir: string) =>
			dir === "/usr/bin" ? ["ls", "lsappinfo"] : [];
		const completeFile = makeCompleteArgument(listFiles, () => []);
		expect(completeFile("/usr/bin/ls")).toEqual({
			_tag: CompletionTag.ShowMatches,
			matches: ["/usr/bin/ls ", "/usr/bin/lsappinfo "],
		});
	});

	test("returns NoMatch when the directory is empty", () => {
		const completeFile = makeCompleteArgument(
			() => [],
			() => [],
		);
		expect(completeFile("anything")).toEqual({ _tag: CompletionTag.NoMatch });
	});

	test("treats a bare slash as listing root", () => {
		const listFiles = (dir: string) => (dir === "/" ? ["bin", "etc"] : []);
		const completeFile = makeCompleteArgument(listFiles, () => []);

		expect(completeFile("/")).toEqual({
			_tag: CompletionTag.ShowMatches,
			matches: ["/bin ", "/etc "],
		});
	});
});

describe("completer arg position", () => {
	test("completes a file when after a space", () => {
		const completer = makeCompleter(
			() => ({ _tag: CompletionTag.NoMatch }),
			() => ({ _tag: CompletionTag.Complete, value: "raspberry-90.txt " }),
			mock(),
			mock(() => () => {}),
		);

		expect(completer("wc raspberr")).toEqual([
			["raspberry-90.txt "],
			"raspberr",
		]);
	});

	test("uses command completion when no space in the line", () => {
		const completer = makeCompleter(
			() => ({ _tag: CompletionTag.Complete, value: "echo " }),
			() => ({ _tag: CompletionTag.NoMatch }),
			mock(),
			mock(() => () => {}),
		);

		expect(completer("ec")).toEqual([["echo "], "ec"]);
	});

	test("completes a directory with a trailing slash", () => {
		const listFiles = () => [];
		const listDirectories = (dir: string) => (dir === "." ? ["src"] : []);
		const completeArgument = makeCompleteArgument(listFiles, listDirectories);

		expect(completeArgument("s")).toEqual({
			_tag: CompletionTag.Complete,
			value: "src/",
		});
	});

	test("completes a file with a trailing space", () => {
		const listFiles = (dir: string) => (dir === "." ? ["main.ts"] : []);
		const listDirectories = () => [];
		const completeArgument = makeCompleteArgument(listFiles, listDirectories);

		expect(completeArgument("m")).toEqual({
			_tag: CompletionTag.Complete,
			value: "main.ts ",
		});
	});

	test("shows both files and directories when prefix matches both", () => {
		const listFiles = (dir: string) => (dir === "." ? ["completion.ts"] : []);
		const listDirectories = (dir: string) => (dir === "." ? ["compiler"] : []);
		const completeArgument = makeCompleteArgument(listFiles, listDirectories);

		expect(completeArgument("comp")).toEqual({
			_tag: CompletionTag.ShowMatches,
			matches: ["compiler/", "completion.ts "],
		});
	});
});

describe("completer", () => {
	test("rings bell and returns empty on NoMatch", () => {
		const bell = mock();
		const list = mock(() => () => {});
		const completer = makeCompleter(
			() => ({ _tag: CompletionTag.NoMatch }),
			() => ({ _tag: CompletionTag.NoMatch }),
			bell,
			list,
		);

		expect(completer("xyz")).toEqual([[], "xyz"]);
		expect(bell).toHaveBeenCalledTimes(1);
		expect(list).not.toHaveBeenCalled();
	});

	test("returns the value on Complete without ringing the bell", () => {
		const bell = mock();
		const list = mock(() => () => {});
		const completer = makeCompleter(
			() => ({ _tag: CompletionTag.Complete, value: "echo " }),
			() => ({ _tag: CompletionTag.NoMatch }),
			bell,
			list,
		);

		expect(completer("ec")).toEqual([["echo "], "ec"]);
		expect(bell).not.toHaveBeenCalled();
		expect(list).not.toHaveBeenCalled();
	});

	test("returns the prefix on PartialComplete without ringing the bell", () => {
		const bell = mock();
		const list = mock(() => () => {});
		const completer = makeCompleter(
			() => ({ _tag: CompletionTag.PartialComplete, value: "custom_" }),
			() => ({ _tag: CompletionTag.NoMatch }),
			bell,
			list,
		);

		expect(completer("cu")).toEqual([["custom_"], "cu"]);
		expect(bell).not.toHaveBeenCalled();
		expect(list).not.toHaveBeenCalled();
	});

	test("rings bell on first tab when result is ShowMatches", () => {
		const bell = mock();
		const list = mock(() => () => {});
		const completer = makeCompleter(
			() => ({
				_tag: CompletionTag.ShowMatches,
				matches: ["exit ", "expand "],
			}),
			() => ({ _tag: CompletionTag.NoMatch }),
			bell,
			list,
		);

		expect(completer("ex")).toEqual([[], "ex"]);
		expect(bell).toHaveBeenCalledTimes(1);
		expect(list).not.toHaveBeenCalled();
	});

	test("lists matches on second tab with the same prefix", () => {
		const bell = mock();
		const listEffect = mock();
		const list = mock(
			(_matches: ReadonlyArray<string>, _line: string) => listEffect,
		);
		const completer = makeCompleter(
			() => ({
				_tag: CompletionTag.ShowMatches,
				matches: ["exit ", "expand "],
			}),
			() => ({ _tag: CompletionTag.NoMatch }),
			bell,
			list,
		);

		completer("ex");
		completer("ex");

		expect(list).toHaveBeenCalledTimes(1);
		expect(list.mock.calls[0]).toEqual([["exit ", "expand "], "ex"]);
		expect(listEffect).toHaveBeenCalledTimes(1);
	});

	test("changing the prefix resets the tab counter", () => {
		const bell = mock();
		const list = mock(() => () => {});
		const completer = makeCompleter(
			(input: string) =>
				input === "ex"
					? { _tag: CompletionTag.ShowMatches, matches: ["exit ", "expand "] }
					: { _tag: CompletionTag.ShowMatches, matches: ["echo ", "echain "] },
			() => ({ _tag: CompletionTag.NoMatch }),
			bell,
			list,
		);

		completer("ex");
		completer("ec");

		expect(bell).toHaveBeenCalledTimes(2);
		expect(list).not.toHaveBeenCalled();
	});
});
