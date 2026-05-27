export enum ResultTag {
	Normal = "Normal",
	Exit = "Exit",
}

export type NormalResult = { _tag: ResultTag.Normal };
export type ExitResult = { _tag: ResultTag.Exit; code: number };
export type CommandResult = NormalResult | ExitResult;

export const normal: NormalResult = { _tag: ResultTag.Normal };
export const exitWith = (code: number): CommandResult => ({
	_tag: ResultTag.Exit,
	code,
});
