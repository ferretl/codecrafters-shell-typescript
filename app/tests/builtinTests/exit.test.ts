import { test } from "bun:test";
import * as exit from "../../builtins/exit";
import { expectExit } from "../helpers";

test("exit should return an exit code of 0 if no arguments are provided", () => {
	expectExit(exit.exit([])(), 0);
});

test("exit should return an exit code of 0 if the argument is an invalid number", () => {
	expectExit(exit.exit(["invalid"])(), 0);
});

test("exit should return the provided exit code if it is a valid number", () => {
	expectExit(exit.exit(["42"])(), 42);
});
