import { homedir } from "node:os";
import * as IOE from "fp-ts/IOEither";
import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import * as RA from "fp-ts/ReadonlyArray";
import { type Command, output } from "../types";
export const cd: Command = (args) =>
	pipe(
		RA.head(args),
		O.getOrElse(() => homedir()),
		(targetDir) =>
			IOE.tryCatch(
				() => {
					process.chdir(targetDir);
					return output(O.none);
				},
				() => ({ message: `cd: ${targetDir}: No such file or directory` }),
			),
	);
