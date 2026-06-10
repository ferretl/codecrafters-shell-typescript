import { describe, test } from "bun:test";
import { builtinNames } from "../../builtins/lookup";
import { type } from "../../builtins/type";
import { empty } from "../../commmandTypes";
import { expectBuiltin, expectStderr, expectStdout } from "../helpers";

test("type is registered as a builtin", () => expectBuiltin("type"));

describe("type identifies builtins", () => {
	test.each([
		...builtinNames,
	])("type identifies %s as a builtin", async (name: string) => {
		await expectStdout(type([name], empty()), `${name} is a shell builtin\n`);
	});
});

test("type should correctly identify path commands", async () => {
	await expectStdout(type(["ls"], empty()), "ls is /bin/ls\n");
});

test("type should report unknown commands as not found", async () => {
	await expectStdout(
		type(["unknowncommand"], empty()),
		"unknowncommand not found\n",
	);
});

test("type with no arguments should write an error to stderr", async () => {
	await expectStderr(type([], empty()), "No arguments given!\n");
});
