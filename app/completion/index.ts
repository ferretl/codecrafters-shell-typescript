import { pipe } from "fp-ts/function";
import * as RA from "fp-ts/ReadonlyArray";
import * as S from "fp-ts/string";
import {
	listFilesInDir,
	listPathExecutables,
	makeCompleteCommand,
	makeCompleteFile,
	makeCompleter,
} from "./completionCommand";

const cachedExecutables = listPathExecutables();

export const completeCommand = makeCompleteCommand(cachedExecutables);
export const completeFile = makeCompleteFile(listFilesInDir());
export const completer = makeCompleter(
	completeCommand,
	completeFile,
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
