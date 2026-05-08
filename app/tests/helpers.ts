import { expect } from "bun:test";
import type * as E from "fp-ts/Either";
import type * as O from "fp-ts/Option";
import { type CommandError, type CommandResult, ResultTag } from "../types";

type EvalResult = E.Either<CommandError, CommandResult>;

export const expectOutput = (
	result: EvalResult,
	text: O.Option<string>,
): void => {
	if (result._tag !== "Right") {
		throw new Error(`expected Right, got Left: ${result.left.message}`);
	}
	if (result.right._tag !== ResultTag.Output) {
		throw new Error(`expected Output, got ${result.right._tag}`);
	}
	expect(result.right.text).toEqual(text);
};

export const expectExit = (result: EvalResult, code: number): void => {
	if (result._tag !== "Right") {
		throw new Error(`expected Right, got Left: ${result.left.message}`);
	}
	if (result.right._tag !== ResultTag.Exit) {
		throw new Error(`expected Exit, got ${result.right._tag}`);
	}
	expect(result.right.code).toBe(code);
};

export const expectError = (result: EvalResult, message: string): void => {
	if (result._tag !== "Left") {
		throw new Error(`expected Left, got Right`);
	}
	expect(result.left.message).toBe(message);
};

export const unwrapRight = <L extends { message: string }, R>(
	either: E.Either<L, R>,
): R => {
	if (either._tag !== "Right") {
		throw new Error(`expected Right, got Left: ${either.left.message}`);
	}
	return either.right;
};

export const expectLeft = <L extends { message: string }, R>(
	either: E.Either<L, R>,
	message: string,
): void => {
	if (either._tag !== "Left") {
		throw new Error(`expected Left, got Right`);
	}
	expect(either.left.message).toBe(message);
};
