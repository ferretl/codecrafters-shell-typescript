export enum CompletionTag {
	NoMatch,
	Complete,
	PartialComplete,
	ShowMatches,
}

export type CompletionResult =
	| { _tag: CompletionTag.NoMatch }
	| { _tag: CompletionTag.Complete; value: string }
	| { _tag: CompletionTag.PartialComplete; value: string }
	| { _tag: CompletionTag.ShowMatches; matches: ReadonlyArray<string> };
