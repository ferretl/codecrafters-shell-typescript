import { test } from "bun:test";
import * as exit from "../../builtins/exit";
import { empty } from "../../commmandTypes";
import { expectBuiltin, expectExit } from "../helpers";

test("exit is registered as a builtin", () => expectBuiltin("exit"));

test("exit should return an exit code of 0 if no arguments are provided", async () => {
	await expectExit(exit.exit([], empty()), 0);
});

test("exit should return an exit code of 0 if the argument is an invalid number", async () => {
	await expectExit(exit.exit(["invalid"], empty()), 0);
});

test("exit should return the provided exit code if it is a valid number", async () => {
	await expectExit(exit.exit(["42"], empty()), 42);
});
