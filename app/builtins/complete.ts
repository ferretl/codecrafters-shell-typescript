import * as IO from "fp-ts/IO";
import {
	builtinCommand,
	type Command,
	empty,
	fromString,
	normal,
} from "../commmandTypes";

export const complete: Command = () =>
	IO.of(builtinCommand(fromString(""), empty(), normal));
