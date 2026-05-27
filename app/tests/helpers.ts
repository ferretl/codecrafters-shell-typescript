import { expect } from "bun:test";
import type { Readable } from "node:stream";
import type * as E from "fp-ts/Either";
import type * as IO from "fp-ts/IO";
import type * as O from "fp-ts/Option";
import { ResultTag, type StreamedCommand } from "../types";

const readAll = async (r: Readable): Promise<string> =>
	(await r.toArray()).join("");

export const expectStdout = async (
	cmd: IO.IO<StreamedCommand>,
	expected: string,
): Promise<void> => {
	expect(await readAll(cmd().stdout)).toBe(expected);
};

export const expectStderr = async (
	cmd: IO.IO<StreamedCommand>,
	expected: string,
): Promise<void> => {
	expect(await readAll(cmd().stderr)).toBe(expected);
};

export const expectExit = async (
	cmd: IO.IO<StreamedCommand>,
	code: number,
): Promise<void> => {
	const executed = cmd();
	const [, , result] = await Promise.all([
		executed.stdout.toArray(),
		executed.stderr.toArray(),
		executed.done(),
	]);
	if (result._tag !== "Right") {
		throw new Error(`expected Right, got Left: ${result.left.message}`);
	}
	if (result.right._tag !== ResultTag.Exit) {
		throw new Error(`expected Exit, got ${result.right._tag}`);
	}
	expect(result.right.code).toBe(code);
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

export const expectSome = <A>(option: O.Option<A>, value: A): void => {
	if (option._tag !== "Some") {
		throw new Error("expected Some, got None");
	}
	expect(option.value).toBe(value);
};
