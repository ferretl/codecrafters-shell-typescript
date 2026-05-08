import { afterEach, expect, test } from "bun:test";
import * as O from "fp-ts/Option";
import * as pwd from "../../builtins/pwd";
import { ResultTag } from "../../types";

const orignalCwd = process.cwd();
afterEach(() => process.chdir(orignalCwd));

test("pwd should return the current working directory", () => {
	const result = pwd.pwd([])();
	const expected = O.some(process.cwd());
	expect(result._tag).toBe("Right");
	if (result._tag === "Right") {
		expect(result.right._tag).toBe(ResultTag.Output);
		if (result.right._tag === "Output") {
			const text = result.right.text;
			expect(text).toEqual(expected);
		}
	}
});

test("pwd should ignore any arguments", () => {
	const result = pwd.pwd(["unexpected", "arguments"])();
	const expected = O.some(process.cwd());
	expect(result._tag).toBe("Right");
	if (result._tag === "Right") {
		expect(result.right._tag).toBe(ResultTag.Output);
		if (result.right._tag === "Output") {
			const text = result.right.text;
			expect(text).toEqual(expected);
		}
	}
});

test("if we change the directory, pwd should reflect that change", () => {
	const original = process.cwd();
	process.chdir("..");
	const result = pwd.pwd([])();
	const expected = O.some(process.cwd());
	expect(result._tag).toBe("Right");
	if (result._tag === "Right") {
		expect(result.right._tag).toBe(ResultTag.Output);
		if (result.right._tag === "Output") {
			const text = result.right.text;
			expect(text).toEqual(expected);
		}
	}
	process.chdir(original); // Change back to the original directory after the test
});
