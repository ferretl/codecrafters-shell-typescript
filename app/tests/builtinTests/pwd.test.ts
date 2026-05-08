import { afterEach, test } from "bun:test";
import * as O from "fp-ts/Option";
import * as pwd from "../../builtins/pwd";
import { expectOutput } from "../helpers";

const orignalCwd = process.cwd();
afterEach(() => process.chdir(orignalCwd));

test("pwd should return the current working directory", () => {
	expectOutput(pwd.pwd([])(), O.some(process.cwd()));
});

test("pwd should ignore any arguments", () => {
	expectOutput(pwd.pwd(["unexpected", "arguments"])(), O.some(process.cwd()));
});

test("if we change the directory, pwd should reflect that change", () => {
	process.chdir("..");
	expectOutput(pwd.pwd([])(), O.some(process.cwd()));
});
