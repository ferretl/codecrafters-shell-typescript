import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import * as RA from "fp-ts/ReadonlyArray";
import type { CommandArgs } from "../types";

enum QuoteMode {
	None,
	Single,
	Double,
}

type ParseState = {
	quoteMode: QuoteMode;
	escaped: boolean;
	current: string;
	args: ReadonlyArray<string>;
};

type StepFn = (state: ParseState, char: string) => ParseState;

const initialState: ParseState = {
	quoteMode: QuoteMode.None,
	escaped: false,
	current: "",
	args: [],
};

const appendToState = (state: ParseState, character: string): ParseState => ({
	...state,
	escaped: false,
	current: state.current + character,
});

const flushState = (state: ParseState): ParseState => ({
	...state,
	current: "",
	args: RA.append(state.current)(state.args),
});

const stepQuoted = (state: ParseState, char: string, closeChar: string) =>
	char === closeChar
		? { ...state, quoteMode: QuoteMode.None }
		: appendToState(state, char);

const setQuoteMode =
	(mode: QuoteMode): StepFn =>
	(state) => ({ ...state, escaped: false, quoteMode: mode });

const flushIfPending: StepFn = (state) =>
	state.current ? flushState(state) : state;

const expandTilde: StepFn = (state, char) =>
	appendToState(state, state.current ? char : (process.env.HOME ?? "~"));

const beginEscape: StepFn = (state) => ({ ...state, escaped: true });

const unquotedHandlers: Record<string, StepFn> = {
	"'": setQuoteMode(QuoteMode.Single),
	'"': setQuoteMode(QuoteMode.Double),
	" ": flushIfPending,
	"\t": flushIfPending,
	"\\": beginEscape,
	"~": expandTilde,
};

const stepUnquoted: StepFn = (state, char) =>
	(unquotedHandlers[char] ?? appendToState)(state, char);

const stepInsideSingle: StepFn = (state, char) => stepQuoted(state, char, "'");

const stepInsideDouble: StepFn = (state, char) =>
	char === "\\" ? beginEscape(state, char) : stepQuoted(state, char, '"');

const DOUBLE_SPECIALS = new Set(['"', "\\"]);

const stepEscapedDouble: StepFn = (state, char) =>
	appendToState(state, DOUBLE_SPECIALS.has(char) ? char : `\\${char}`);

const modeHandlers: Record<QuoteMode, StepFn> = {
	[QuoteMode.None]: stepUnquoted,
	[QuoteMode.Single]: stepInsideSingle,
	[QuoteMode.Double]: stepInsideDouble,
};

const escapedHandlers: Record<QuoteMode, StepFn> = {
	[QuoteMode.None]: appendToState,
	[QuoteMode.Single]: stepInsideSingle,
	[QuoteMode.Double]: stepEscapedDouble,
};

const stepChar: StepFn = (state, char) =>
	(state.escaped ? escapedHandlers : modeHandlers)[state.quoteMode](
		state,
		char,
	);

export const tokenize = (input: string): CommandArgs => {
	const { current, args } = pipe([...input], RA.reduce(initialState, stepChar));
	return pipe(
		O.fromPredicate((s: string) => s.length > 0)(current),
		O.match(
			() => args,
			(character) => RA.append(character)(args),
		),
	);
};
