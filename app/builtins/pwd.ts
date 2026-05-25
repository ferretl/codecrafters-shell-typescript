import fs from "node:fs";
import * as TE from "fp-ts/TaskEither";
import { type Command, empty, fromString, normal } from "../types";

export const pwd: Command = () => ({
	stdout: fromString(`${fs.realpathSync(process.cwd())}\n`),
	stderr: empty(),
	done: TE.right(normal),
});
