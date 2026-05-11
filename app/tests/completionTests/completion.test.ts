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
		const c = makeCompleteCommand(["custom_executable"]);
		expect(c("c")).toEqual(["cd ", "custom_executable "]);
	});

	test("deduplicates when builtin and PATH share a name", () => {
		const c = makeCompleteCommand(["echo"]);
		expect(c("echo")).toEqual(["echo "]);
	});
});

describe("completer", () => {
	const noopBell = () => {};

	test("returns matches and the original line unchanged", () => {
		const completer = makeCompleter(makeCompleteCommand([]), noopBell);
		expect(completer("ec")).toEqual([["echo "], "ec"]);
	});

	test("returns empty matches when nothing matches the prefix", () => {
		const completer = makeCompleter(makeCompleteCommand([]), noopBell);
		expect(completer("xyz")).toEqual([[], "xyz"]);
	});

	test("rings the bell when there are no matches", () => {
		const bell = mock();
		const completer = makeCompleter(makeCompleteCommand([]), bell);
		completer("xyz");
		expect(bell).toHaveBeenCalledTimes(1);
	});

	test("does not ring the bell when there is a match", () => {
		const bell = mock();
		const completer = makeCompleter(makeCompleteCommand([]), bell);
		completer("ec");
		expect(bell).not.toHaveBeenCalled();
	});
});
