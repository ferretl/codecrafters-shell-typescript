import { afterEach, test } from "bun:test";
import { realpathSync } from "node:fs";
import * as pwd from "../../builtins/pwd";
import { empty } from "../../commmandTypes";
import { expectStdout } from "../helpers";

const originalCwd = process.cwd();
afterEach(() => process.chdir(originalCwd));

test("pwd should return the current working directory", async () => {
	await expectStdout(pwd.pwd([], empty()), `${realpathSync(process.cwd())}\n`);
});

test("pwd should ignore any arguments", async () => {
	await expectStdout(
		pwd.pwd(["unexpected", "arguments"], empty()),
		`${realpathSync(process.cwd())}\n`,
	);
});

test("if we change the directory, pwd should reflect that change", async () => {
	process.chdir("..");
	await expectStdout(pwd.pwd([], empty()), `${realpathSync(process.cwd())}\n`);
});
