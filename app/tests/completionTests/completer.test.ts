import {
	afterEach,
	beforeEach,
	describe,
	expect,
	mock,
	spyOn,
	test,
} from "bun:test";
import { completer } from "../../completion";

describe("completer", () => {
	let writeSpy: ReturnType<typeof spyOn>;

	beforeEach(() => {
		writeSpy = spyOn(process.stdout, "write").mockImplementation(() => true);
	});

	afterEach(() => {
		writeSpy.mockRestore();
	});

	test("returns all builtins starting wqith prefix with a trailing space", () => {
		expect(completer("e")).toEqual([["echo ", "exit "], "e"]);
	});

	test("returns empty matches when no builtin matches the prefix", () => {
		expect(completer("xyz")).toEqual([[], "xyz"]);
	});
});

describe("completer bell", () => {
	afterEach(() => {
		mock.restore();
	});

	test("rings the bell when there are no matches", () => {
		const spy = spyOn(process.stdout, "write").mockImplementation(() => true);
		completer("xyz");
		expect(spy).toHaveBeenCalledWith("\x07");
	});

	test("does not ring the bell when there is a match", () => {
		const spy = spyOn(process.stdout, "write").mockImplementation(() => true);
		completer("ec");
		expect(spy).not.toHaveBeenCalled();
	});
});
