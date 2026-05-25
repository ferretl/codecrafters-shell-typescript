import fs from "node:fs";
import {
	builtinCommand,
	type Command,
	empty,
	fromString,
	normal,
} from "../types";

export const pwd: Command = () => () =>
	builtinCommand(
		fromString(`${fs.realpathSync(process.cwd())}\n`),
		empty(),
		normal,
	);
