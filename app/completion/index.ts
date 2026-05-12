import { pipe } from "fp-ts/function";
import * as RA from "fp-ts/ReadonlyArray";
import * as S from "fp-ts/string";
import {
	listPathExecutables,
	makeCompleteCommand,
	makeCompleter,
} from "./completionComand";

const cachedExecutables = listPathExecutables();

export const completeCommand = makeCompleteCommand(cachedExecutables);
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
