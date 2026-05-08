import fs from "node:fs";
import * as IOE from "fp-ts/IOEither";
import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import { type Command, output } from "../types";

export const pwd: Command = () =>
	IOE.right(pipe(fs.realpathSync(process.cwd()), O.some, output));
