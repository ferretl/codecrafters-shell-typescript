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
type MatchHandlers = {
	[T in CompletionTag]: (
		result: Extract<CompletionResult, { _tag: T }>,
		dependecies: HandlerDependencies,
	) => IO.IO<CompletionTuple>;
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
	dependecies: HandlerDependencies,
): IO.IO<CompletionTuple> =>
	pipe(
		dependecies.lastAmbiguousPrefix.write(""),
		IO.map((): CompletionTuple => [value, dependecies.prefix]),
	);

const noMatch = (dependecies: HandlerDependencies): IO.IO<CompletionTuple> =>
	pipe(
		dependecies.bell,
		IO.chain(() => clearAndReturn([], dependecies)),
	);

const completed = (
	value: string,
	dependecies: HandlerDependencies,
): IO.IO<CompletionTuple> => clearAndReturn([value], dependecies);

const ringForNewAmbiguity = (
	dependecies: HandlerDependencies,
): IO.IO<CompletionTuple> =>
	pipe(
		dependecies.bell,
		IO.chain(() => dependecies.lastAmbiguousPrefix.write(dependecies.prefix)),
		IO.map((): CompletionTuple => [[], dependecies.prefix]),
	);

const listAndClear = (
	matches: ReadonlyArray<string>,
	dependecies: HandlerDependencies,
): IO.IO<CompletionTuple> =>
	pipe(
		dependecies.list(matches, dependecies.line),
		IO.chain(() => clearAndReturn([], dependecies)),
	);

const showMatches = (
	result: Extract<CompletionResult, { _tag: CompletionTag.ShowMatches }>,
	dependencies: HandlerDependencies,
): IO.IO<CompletionTuple> =>
	pipe(
		dependencies.lastAmbiguousPrefix.read,
		IO.chain((prev) =>
			prev !== dependencies.prefix
				? ringForNewAmbiguity(dependencies)
				: listAndClear(result.matches, dependencies),
		),
	);

const matchHandlers: MatchHandlers = {
	[CompletionTag.NoMatch]: (_result, dependencies) => noMatch(dependencies),
	[CompletionTag.Complete]: (result, dependencies) =>
		completed(result.value, dependencies),
	[CompletionTag.PartialComplete]: (result, dependencies) =>
		completed(result.value, dependencies),
	[CompletionTag.ShowMatches]: showMatches,
};

const dispatchResult = (
	result: CompletionResult,
	dependencies: HandlerDependencies,
): IO.IO<CompletionTuple> => {
	const handler = matchHandlers[result._tag] as (
		result: CompletionResult,
		dependencies: HandlerDependencies,
	) => IO.IO<CompletionTuple>;
	return handler(result, dependencies);
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
): CompletionTuple => {
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
	})();
};

export const makeCompleter = (
	completeCommand: Completer,
	completeArgument: Completer,
	bell: IO.IO<void>,
	list: (matches: ReadonlyArray<string>, line: string) => IO.IO<void>,
): ((line: string) => CompletionTuple) => {
	const context: CompleterContext = {
		completeCommand,
		completeArgument,
		bell,
		list,
		lastAmbiguousPrefix: newIORef("")(),
	};
	return (line) => completeLine(line, context);
};
