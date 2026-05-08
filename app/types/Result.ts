import * as O from "fp-ts/lib/Option";

export enum ResultTag {
	Output = "Output",
	Exit = "Exit",
}

type OutputResult = {
	_tag: ResultTag.Output;
	text: O.Option<string>;
	errorText: O.Option<string>;
};

type ExitResult = {
	_tag: ResultTag.Exit;
	code: number;
};

export type CommandResult = OutputResult | ExitResult;

export const output = (
	text: O.Option<string>,
	errorText: O.Option<string> = O.none,
): CommandResult => ({ _tag: ResultTag.Output, text, errorText });
