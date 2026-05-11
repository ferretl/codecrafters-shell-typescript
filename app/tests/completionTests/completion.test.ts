import { describe, expect, mock, test } from "bun:test";
import { makeCompleteCommand, makeCompleter } from "../../completion";

describe("completeCommand", () => {
	const completeCommand = makeCompleteCommand([]);

	test("matches a single builtin by prefix", () => {
		expect(completeCommand("ec")).toEqual(["echo "]);
	});

	test("matches multiple builtins with a shared prefix", () => {
		expect(completeCommand("e")).toEqual(["echo ", "exit "]);
	});

	test("returns all builtins for empty prefix, sorted", () => {
		expect(completeCommand("")).toEqual([
			"cd ",
			"echo ",
			"exit ",
			"pwd ",
			"type ",
		]);
	});

	test("returns empty for an unknown prefix", () => {
		expect(completeCommand("xyz")).toEqual([]);
	});

	test("includes PATH executables alongside builtins, sorted", () => {
		const completer = makeCompleteCommand(["custom_executable"]);
		expect(completer("c")).toEqual(["cd ", "custom_executable "]);
	});

	test("deduplicates when builtin and PATH share a name", () => {
		const completer = makeCompleteCommand(["echo"]);
		expect(completer("echo")).toEqual(["echo "]);
	});
});

describe("completer", () => {
	test("rings bell on first tab when matches are ambiguous", () => {
		const bell = mock();
		const list = mock(() => () => {});
		const completer = makeCompleter(
			makeCompleteCommand(["exit", "expand"]),
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
		const list = mock((_matches: string[], _line: string) => listEffect);
		const completer = makeCompleter(
			makeCompleteCommand(["exit", "expand"]),
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
			makeCompleteCommand(["exit", "expand", "echain"]),
			bell,
			list,
		);

		completer("ex");
		completer("ec");

		expect(bell).toHaveBeenCalledTimes(2);
		expect(list).not.toHaveBeenCalled();
	});
});
