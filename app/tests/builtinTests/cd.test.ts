import { afterEach, expect, test } from "bun:test";
import { realpathSync } from "node:fs";
import { pipe } from "fp-ts/function";
import * as O from "fp-ts/Option";
import * as cd from "../../builtins/cd";
import { empty } from "../../types";
import { expectStderr, expectStdout } from "../helpers";

const original = process.cwd();
afterEach(() => process.chdir(original));

test("cd should change the current working directory", async () => {
	await expectStdout(cd.cd(["/tmp"], empty()), "");
	expect(process.cwd()).toBe(realpathSync("/tmp"));
});

test("cd with no arguments should change to the home directory", async () => {
	const home = pipe(
		O.fromNullable(process.env.HOME),
		O.alt(() => O.fromNullable(process.env.USERPROFILE)),
		O.getOrElseW(() => {
			throw new Error("HOME/USERPROFILE not set");
		}),
	);
	await expectStdout(cd.cd([], empty()), "");
	expect(process.cwd()).toBe(realpathSync(home));
});

test("cd should write to stderr if the target directory does not exist", async () => {
	await expectStderr(
		cd.cd(["/nonexistent"], empty()),
		"cd: /nonexistent: No such file or directory\n",
	);
});

test("cd should write to stderr if the target is not a directory", async () => {
	await expectStderr(
		cd.cd(["/etc/hosts"], empty()),
		"cd: /etc/hosts: No such file or directory\n",
	);
});
