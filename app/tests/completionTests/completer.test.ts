import { describe, expect, test } from "bun:test";
import { completer } from "../../completion";

describe("completer", () => {
	test("returns all builtins starting wqith prefix with a trailing space", () => {
		expect(completer("e")).toEqual([["echo ", "exit "], "e"]);
	});

	test("returns empty matches when no builtin matches the prefix", () => {
		expect(completer("xyz")).toEqual([[], "xyz"]);
	});
});
