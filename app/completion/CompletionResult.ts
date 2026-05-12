export enum CompletionTag {
	NoMatch = "NoMatch",
	Complete = "Complete",
	PartialComplete = "PartialComplete",
	ShowMatches = "ShowMatches",
}

export type CompletionResult =
	| { _tag: CompletionTag.NoMatch }
	| { _tag: CompletionTag.Complete; value: string }
	| { _tag: CompletionTag.PartialComplete; value: string }
	| { _tag: CompletionTag.ShowMatches; matches: ReadonlyArray<string> };
