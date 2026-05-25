import { pipe } from "fp-ts/function";
import * as IO from "fp-ts/IO";
import * as RA from "fp-ts/ReadonlyArray";
import * as S from "fp-ts/string";
import { makeCompleteArgument, makeCompleteCommand } from "./candidates";
import {
	listDirectoriesInDir,
	listFilesInDir,
	listPathExecutables,
} from "./listings";
import { makeCompleter } from "./makeCompleter";

const bell: IO.IO<void> = () => {
	process.stdout.write("\x07");
};

const list =
	(matches: ReadonlyArray<string>, line: string): IO.IO<void> =>
	() => {
		const formatted = pipe(
			matches,
			RA.map(S.trimRight),
			RA.intercalate(S.Monoid)("\t"),
		);
		process.stdout.write(`\n${formatted}\n$ ${line}`);
	};

const listFilesSync = (dir: string): ReadonlyArray<string> =>
	listFilesInDir(dir)();
const listDirectoriesSync = (dir: string): ReadonlyArray<string> =>
	listDirectoriesInDir(dir)();

export type ShellCompleter = (line: string) => [ReadonlyArray<string>, string];

export const makeShellCompleter: IO.IO<ShellCompleter> = pipe(
	listPathExecutables,
	IO.chain((executables) =>
		makeCompleter(
			makeCompleteCommand(executables),
			makeCompleteArgument(listFilesSync, listDirectoriesSync),
			bell,
			list,
		),
	),
);
