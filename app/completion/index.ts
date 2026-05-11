import * as RA from "fp-ts/ReadonlyArray";
import { builtinNames } from "../builtins";

export const completeBuiltins = (prefix: string): ReadonlyArray<string> =>
	builtinNames.filter((builtinName) => builtinName.startsWith(prefix));

export const completer = (line: string): [ReadonlyArray<string>, string] => {
	const matches = completeBuiltins(line).map(
		(builtinName) => `${builtinName} `,
	);
	if (RA.isEmpty(matches)) process.stdout.write("\x07");
	return [matches, line];
};
