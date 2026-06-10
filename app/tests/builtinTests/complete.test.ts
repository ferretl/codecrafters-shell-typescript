import { test } from "bun:test";
import { expectBuiltin } from "../helpers";

test("complete is registered as a builtin", () => expectBuiltin("complete"));
