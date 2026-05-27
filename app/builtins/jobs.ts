import {
	builtinCommand,
	type Command,
	empty,
	fromString,
	normal,
} from "../types";

export const jobs: Command = () => () =>
	builtinCommand(fromString(""), empty(), normal);
