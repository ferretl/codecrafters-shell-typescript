import { test } from "bun:test";
import * as O from "fp-ts/Option";
import * as echo from "../../builtins/echo";
import { expectOutput } from "../helpers";

test("echo should return the concatenated arguments as output", () => {
	expectOutput(echo.echo(["Hello", "world!"])(), O.some("Hello world!"));
});

test("echo with no arguments should return an empty string", () => {
	expectOutput(echo.echo([])(), O.some(""));
});
