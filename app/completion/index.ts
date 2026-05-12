import { pipe } from "fp-ts/function";
import * as RA from "fp-ts/ReadonlyArray";
import * as S from "fp-ts/string";
import {
	listFilesInDir,
	listPathExecutables,
	makeCompleteCommand,
	makeCompleter,
} from "./completionCommand";

const cachedExecutables = listPathExecutables();
const cachedFiles = listFilesInDir();

export const completeCommand = makeCompleteCommand(
	cachedExecutables,
	cachedFiles,
);
export const completer = makeCompleter(
	completeCommand,
	() => process.stdout.write("\x07"),
	(matches, line) => () => {
		const formatted = pipe(
			matches,
			RA.map(S.trimRight),
			RA.intercalate(S.Monoid)("\t"),
		);
		process.stdout.write(`\n${formatted}\n$ ${line}`);
	},
);
