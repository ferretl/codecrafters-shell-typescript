import { pipe } from "fp-ts/function";
import * as IO from "fp-ts/IO";
import { type IORef, newIORef } from "fp-ts/lib/IORef";
import {
	type Completer,
	type CompletionResult,
	CompletionTag,
} from "./CompletionResult";

type CompletionTuple = [ReadonlyArray<string>, string];

type HandlerDependencies = {
	prefix: string;
	line: string;
	lastAmbiguousPrefix: IORef<string>;
	bell: IO.IO<void>;
	list: (matches: ReadonlyArray<string>, line: string) => IO.IO<void>;
};

type CompleterContext = {
	completeCommand: Completer;
	completeArgument: Completer;
	bell: IO.IO<void>;
	list: (matches: ReadonlyArray<string>, line: string) => IO.IO<void>;
	lastAmbiguousPrefix: IORef<string>;
};

const clearAndReturn = (
	value: ReadonlyArray<string>,
	dependencies: HandlerDependencies,
): IO.IO<CompletionTuple> =>
	pipe(
		dependencies.lastAmbiguousPrefix.write(""),
		IO.map((): CompletionTuple => [value, dependencies.prefix]),
	);

const noMatch = (dependencies: HandlerDependencies): IO.IO<CompletionTuple> =>
	pipe(
		dependencies.bell,
		IO.chain(() => clearAndReturn([], dependencies)),
	);

const completed = (
	value: string,
	dependencies: HandlerDependencies,
): IO.IO<CompletionTuple> => clearAndReturn([value], dependencies);

const ringForNewAmbiguity = (
	dependencies: HandlerDependencies,
): IO.IO<CompletionTuple> =>
	pipe(
		dependencies.bell,
		IO.chain(() => dependencies.lastAmbiguousPrefix.write(dependencies.prefix)),
		IO.map((): CompletionTuple => [[], dependencies.prefix]),
	);

const listAndClear = (
	matches: ReadonlyArray<string>,
	dependencies: HandlerDependencies,
): IO.IO<CompletionTuple> =>
	pipe(
		dependencies.list(matches, dependencies.line),
		IO.chain(() => clearAndReturn([], dependencies)),
	);

const showMatches = (
	matches: ReadonlyArray<string>,
	dependencies: HandlerDependencies,
): IO.IO<CompletionTuple> =>
	pipe(
		dependencies.lastAmbiguousPrefix.read,
		IO.chain((prev) =>
			prev !== dependencies.prefix
				? ringForNewAmbiguity(dependencies)
				: listAndClear(matches, dependencies),
		),
	);

const dispatchResult = (
	result: CompletionResult,
	dependencies: HandlerDependencies,
): IO.IO<CompletionTuple> => {
	switch (result._tag) {
		case CompletionTag.NoMatch:
			return noMatch(dependencies);
		case CompletionTag.Complete:
			return completed(result.value, dependencies);
		case CompletionTag.PartialComplete:
			return completed(result.value, dependencies);
		case CompletionTag.ShowMatches:
			return showMatches(result.matches, dependencies);
	}
};

const extractPrefix = (
	line: string,
): { prefix: string; inArgPosition: boolean } => {
	const lastSpace = line.lastIndexOf(" ");
	const inArgPosition = lastSpace !== -1;
	return {
		prefix: inArgPosition ? line.slice(lastSpace + 1) : line,
		inArgPosition,
	};
};

const runCompletion = (
	inArgPosition: boolean,
	prefix: string,
	completeCommand: Completer,
	completeArgument: Completer,
): CompletionResult =>
	inArgPosition ? completeArgument(prefix) : completeCommand(prefix);

const completeLine = (
	line: string,
	context: CompleterContext,
): IO.IO<CompletionTuple> => {
	const { prefix, inArgPosition } = extractPrefix(line);
	const result = runCompletion(
		inArgPosition,
		prefix,
		context.completeCommand,
		context.completeArgument,
	);
	return dispatchResult(result, {
		prefix,
		line,
		lastAmbiguousPrefix: context.lastAmbiguousPrefix,
		bell: context.bell,
		list: context.list,
	});
};

export const makeCompleter = (
	completeCommand: Completer,
	completeArgument: Completer,
	bell: IO.IO<void>,
	list: (matches: ReadonlyArray<string>, line: string) => IO.IO<void>,
): IO.IO<(line: string) => CompletionTuple> =>
	pipe(
		newIORef(""),
		IO.map((lastAmbiguousPrefix) => {
			const context: CompleterContext = {
				completeCommand,
				completeArgument,
				bell,
				list,
				lastAmbiguousPrefix,
			};
			return (line: string) => completeLine(line, context)();
		}),
	);
