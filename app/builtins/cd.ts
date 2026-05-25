import { homedir } from "node:os";
import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import * as RA from "fp-ts/ReadonlyArray";
import {
	builtinCommand,
	type Command,
	empty,
	fromString,
	normal,
	type StreamedCommand,
} from "../types";

const ok = (): StreamedCommand => builtinCommand(empty(), empty(), normal);

const errored = (message: string): StreamedCommand =>
	builtinCommand(empty(), fromString(message), normal);

const attemptChdir = (targetDir: string): StreamedCommand => {
	try {
		process.chdir(targetDir);
		return ok();
	} catch {
		return errored(`cd: ${targetDir}: No such file or directory\n`);
	}
};

export const cd: Command = (args) =>
	pipe(
		RA.head(args),
		O.getOrElse(() => homedir()),
		attemptChdir,
	);
