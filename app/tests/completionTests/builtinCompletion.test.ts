import { describe, expect, test } from "bun:test";
import { completeBuiltins } from "../../completion";

describe("completeBuiltins", () => {
	test("returns all builtins starting with prefix", () => {
		expect(completeBuiltins("e")).toEqual(["echo", "exit"]);
	});

	test("returns single match for unique prefix", () => {
		expect(completeBuiltins("ec")).toEqual(["echo"]);
	});

	test("returns empty for no match", () => {
		expect(completeBuiltins("xyz")).toEqual([]);
	});

	test("returns all builtins for empty prefix", () => {
		expect(completeBuiltins("")).toEqual(["cd", "echo", "exit", "pwd", "type"]);
	});
});
