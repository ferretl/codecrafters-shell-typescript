import { test } from "bun:test";
import { echo } from "../../builtins/echo";
import { empty } from "../../commmandTypes";
import { expectStdout } from "../helpers";

test("echo should return the concatenated arguments as output", async () => {
	await expectStdout(echo(["Hello", "world!"], empty()), "Hello world!\n");
});

test("echo with no arguments should return just a newline", async () => {
	await expectStdout(echo([], empty()), "\n");
});
