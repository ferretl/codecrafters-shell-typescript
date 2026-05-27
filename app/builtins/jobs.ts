import {
	builtinCommand,
	type Command,
	empty,
	fromString,
	normal,
} from "../commmandTypes";

export const jobs: Command = () => () =>
	builtinCommand(fromString(""), empty(), normal);
