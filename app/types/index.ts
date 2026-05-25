import { Readable } from "node:stream";
import * as E from "fp-ts/Either";
import type * as TE from "fp-ts/TaskEither";
import type { StreamedCommand } from "./Command";
import type { CommandError } from "./Error";
import type { CommandResult } from "./Result";

export * from "./Command";
export * from "./Error";
export * from "./Result";

export const fromString = (s: string): Readable => Readable.from([s]);
export const empty = (): Readable => Readable.from([]);

const waitForEnd = (readable: Readable): Promise<void> =>
	readable.readableEnded
		? Promise.resolve()
		: new Promise((resolve) => {
				readable.once("end", () => resolve());
				readable.once("close", () => resolve());
			});

export const builtinDone =
	(
		stdout: Readable,
		stderr: Readable,
		result: CommandResult,
	): TE.TaskEither<CommandError, CommandResult> =>
	() =>
		Promise.all([waitForEnd(stdout), waitForEnd(stderr)]).then(() =>
			E.right(result),
		);

export const builtinCommand = (
	stdout: Readable,
	stderr: Readable,
	result: CommandResult,
): StreamedCommand => ({
	stdout,
	stderr,
	done: builtinDone(stdout, stderr, result),
});
