import { builtinNames } from "../builtins";

export const completeBuiltins = (prefix: string): ReadonlyArray<string> =>
	builtinNames
		.filter((builtinName) => builtinName.startsWith(prefix))
		.map((autocompletion) => `${autocompletion} `);

// readline completer signature: returns [matches, original substring]
export const completer = (line: string): [ReadonlyArray<string>, string] => [
	completeBuiltins(line),
	line,
];
