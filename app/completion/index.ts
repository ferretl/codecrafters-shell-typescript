import { pipe } from "fp-ts/function";
import * as RA from "fp-ts/ReadonlyArray";
import * as S from "fp-ts/string";
import { makeCompleteArgument, makeCompleteCommand } from "./candidates";
import {
	listDirectoriesInDir,
	listFilesInDir,
	listPathExecutables,
} from "./listings";
import { makeCompleter } from "./makeCompleter";

const cachedExecutables = listPathExecutables();

export const completeCommand = makeCompleteCommand(cachedExecutables);
export const completeArgument = makeCompleteArgument(
	listFilesInDir,
	listDirectoriesInDir,
);
export const completer = makeCompleter(
	completeCommand,
	completeArgument,
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
