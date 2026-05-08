import { afterEach, expect, test } from "bun:test";
import { realpathSync } from "node:fs";
import { pipe } from "fp-ts/function";
import * as O from "fp-ts/Option";
import * as cd from "../../builtins/cd";
import { expectError, expectOutput } from "../helpers";

const original = process.cwd();
afterEach(() => process.chdir(original));

test("cd should change the current working directory", () => {
	expectOutput(cd.cd(["/tmp"])(), O.none);
	expect(process.cwd()).toBe(realpathSync("/tmp"));
});

test("cd with no arguments should change to the home directory", () => {
	const home = pipe(
		O.fromNullable(process.env.HOME),
		O.alt(() => O.fromNullable(process.env.USERPROFILE)),
		O.getOrElseW(() => {
			throw new Error("HOME/USERPROFILE not set");
		}),
	);
	expectOutput(cd.cd([])(), O.none);
	expect(process.cwd()).toBe(realpathSync(home));
});

test("cd should return an error if the target directory does not exist", () => {
	expectError(
		cd.cd(["/nonexistent"])(),
		"cd: /nonexistent: No such file or directory",
	);
});

test("cd should return an error if the target is not a directory", () => {
	expectError(
		cd.cd(["/etc/hosts"])(),
		"cd: /etc/hosts: No such file or directory",
	);
});
