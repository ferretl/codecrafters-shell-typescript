import { describe, expect, mock, test } from "bun:test";
import { CompletionTag } from "../../completion/CompletionResult";
import {
	makeCompleteCommand,
	makeCompleter,
} from "../../completion/completionCommand";

describe("completeCommand", () => {
	const completeCommand = makeCompleteCommand([], []);

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
		const completer = makeCompleteCommand(["custom_a", "custom_b"], []);
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
		const completer = makeCompleteCommand(["custom_executable"], []);
		expect(completer("c")).toEqual({
			_tag: CompletionTag.ShowMatches,
			matches: ["cd ", "custom_executable "],
		});
	});

	test("deduplicates when builtin and PATH share a name", () => {
		const completer = makeCompleteCommand(["echo"], []);
		expect(completer("echo")).toEqual({
			_tag: CompletionTag.Complete,
			value: "echo ",
		});
	});

	test("deduplicates when PATH executable and file share a name", () => {
		const completer = makeCompleteCommand(["custom"], ["custom"]);
		expect(completer("custom")).toEqual({
			_tag: CompletionTag.Complete,
			value: "custom ",
		});
	});

	test("combines builtins, PATH executables, and files", () => {
		const completer = makeCompleteCommand(["cat"], ["config.json"]);
		expect(completer("c")).toEqual({
			_tag: CompletionTag.ShowMatches,
			matches: ["cat ", "cd ", "config.json "],
		});
	});

	test("includes files in matches alongside builtins and PATH", () => {
		const completer = makeCompleteCommand([], ["main.ts", "package.json"]);
		expect(completer("m")).toEqual({
			_tag: CompletionTag.Complete,
			value: "main.ts ",
		});
	});

	test("deduplicates when a builtin and a file share a name", () => {
		const completer = makeCompleteCommand([], ["echo"]);
		expect(completer("echo")).toEqual({
			_tag: CompletionTag.Complete,
			value: "echo ",
		});
	});
});

describe("completer", () => {
	test("rings bell and returns empty on NoMatch", () => {
		const bell = mock();
		const list = mock(() => () => {});
		const completer = makeCompleter(
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
			bell,
			list,
		);

		completer("ex");
		completer("ec");

		expect(bell).toHaveBeenCalledTimes(2);
		expect(list).not.toHaveBeenCalled();
	});
});
