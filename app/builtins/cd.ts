import { homedir } from "node:os";
import * as E from "fp-ts/Either";
import * as IO from "fp-ts/IO";
import * as IOE from "fp-ts/IOEither";
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

const attemptChdir = (targetDir: string): IO.IO<StreamedCommand> =>
	pipe(
		IOE.tryCatch(
			() => process.chdir(targetDir),
			() => `cd: ${targetDir}: No such file or directory\n`,
		),
		IO.map(E.match(errored, ok)),
	);

export const cd: Command = (args) =>
	pipe(
		RA.head(args),
		O.getOrElse(() => homedir()),
		attemptChdir,
	);
