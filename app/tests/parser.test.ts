import { describe, expect, test } from "bun:test";
import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import * as RA from "fp-ts/ReadonlyArray";
import parser, { type ParsedSegment } from "../parser";
import { expectLeft, unwrapRight } from "./helpers";

const TEST_HOME = "/home/test";

const blankSegment: ParsedSegment = {
	name: "",
	args: [],
	redirectOptions: { stdout: O.none, stderr: O.none },
};
const parseFirst = (line: string) =>
	pipe(
		parser(line, TEST_HOME),
		unwrapRight,
		RA.head,
		O.getOrElse(() => blankSegment),
	);

describe("tokenization", () => {
	test("splits a simple command into name and args", () => {
		const result = parseFirst("echo hello world");
		expect(result.name).toBe("echo");
		expect(result.args).toEqual(["hello", "world"]);
	});

	test("collapses runs of spaces", () => {
		const result = parseFirst("echo   hello    world");
		expect(result.args).toEqual(["hello", "world"]);
	});

	test("treats tabs as separators", () => {
		const result = parseFirst("echo\thello\tworld");
		expect(result.args).toEqual(["hello", "world"]);
	});

	test("returns an empty name for an empty line", () => {
		const result = parseFirst("");
		expect(result.name).toBe("");
		expect(result.args).toEqual([]);
	});

	test("returns an empty name for a whitespace-only line", () => {
		const result = parseFirst("   \t  ");
		expect(result.name).toBe("");
		expect(result.args).toEqual([]);
	});

	test("exposes no redirects on a plain command", () => {
		const result = parseFirst("echo hello");
		expect(result.redirectOptions.stdout).toEqual(O.none);
		expect(result.redirectOptions.stderr).toEqual(O.none);
	});
});

describe("single quotes", () => {
	test("preserves spaces inside single quotes", () => {
		expect(parseFirst("echo 'hello world'").args).toEqual(["hello world"]);
	});

	test("does not interpret escapes inside single quotes", () => {
		expect(parseFirst("echo 'a\\nb'").args).toEqual(["a\\nb"]);
	});

	test("allows double quotes inside single quotes", () => {
		expect(parseFirst(`echo 'say "hi"'`).args).toEqual(['say "hi"']);
	});

	test("joins adjacent single-quoted segments without spaces", () => {
		expect(parseFirst("echo 'foo''bar'").args).toEqual(["foobar"]);
	});
});

describe("double quotes", () => {
	test("preserves spaces inside double quotes", () => {
		expect(parseFirst('echo "hello world"').args).toEqual(["hello world"]);
	});

	test("escapes a double quote with backslash", () => {
		expect(parseFirst('echo "say \\"hi\\""').args).toEqual(['say "hi"']);
	});

	test("escapes a backslash with backslash", () => {
		expect(parseFirst('echo "a\\\\b"').args).toEqual(["a\\b"]);
	});

	test("preserves backslash before non-special chars inside double quotes", () => {
		expect(parseFirst('echo "a\\nb"').args).toEqual(["a\\nb"]);
	});

	test("allows single quotes inside double quotes", () => {
		expect(parseFirst(`echo "it's fine"`).args).toEqual(["it's fine"]);
	});
});

describe("backslash escapes outside quotes", () => {
	test("escapes a space into the same token", () => {
		expect(parseFirst("echo hello\\ world").args).toEqual(["hello world"]);
	});

	test("escapes a quote literal", () => {
		expect(parseFirst('echo \\"hi\\"').args).toEqual(['"hi"']);
	});

	test("escapes a backslash", () => {
		expect(parseFirst("echo a\\\\b").args).toEqual(["a\\b"]);
	});
});

describe("tilde expansion", () => {
	test("expands a leading tilde to $HOME", () => {
		expect(parseFirst("cd ~").args).toEqual(["/home/test"]);
	});

	test("does not expand a tilde mid-token", () => {
		expect(parseFirst("echo a~b").args).toEqual(["a~b"]);
	});

	test("does not expand a tilde inside double quotes", () => {
		expect(parseFirst('echo "~"').args).toEqual(["~"]);
	});

	test("does not expand a tilde inside single quotes", () => {
		expect(parseFirst("echo '~'").args).toEqual(["~"]);
	});
});

describe("redirects", () => {
	test("parses > as stdout overwrite", () => {
		const result = parseFirst("echo hi > out.txt");
		expect(result.args).toEqual(["hi"]);
		expect(result.redirectOptions.stdout).toEqual(
			O.some({ path: "out.txt", mode: "overwrite" }),
		);
		expect(result.redirectOptions.stderr).toEqual(O.none);
	});

	test("parses 1> as stdout overwrite", () => {
		expect(parseFirst("echo hi 1> out.txt").redirectOptions.stdout).toEqual(
			O.some({ path: "out.txt", mode: "overwrite" }),
		);
	});

	test("parses >> as stdout append", () => {
		expect(parseFirst("echo hi >> out.txt").redirectOptions.stdout).toEqual(
			O.some({ path: "out.txt", mode: "append" }),
		);
	});

	test("parses 1>> as stdout append", () => {
		expect(parseFirst("echo hi 1>> out.txt").redirectOptions.stdout).toEqual(
			O.some({ path: "out.txt", mode: "append" }),
		);
	});

	test("parses 2> as stderr overwrite", () => {
		const result = parseFirst("echo hi 2> err.txt");
		expect(result.redirectOptions.stderr).toEqual(
			O.some({ path: "err.txt", mode: "overwrite" }),
		);
		expect(result.redirectOptions.stdout).toEqual(O.none);
	});

	test("parses 2>> as stderr append", () => {
		expect(parseFirst("echo hi 2>> err.txt").redirectOptions.stderr).toEqual(
			O.some({ path: "err.txt", mode: "append" }),
		);
	});

	test("parses both stdout and stderr redirects together", () => {
		const result = parseFirst("echo hi > out.txt 2> err.txt");
		expect(result.args).toEqual(["hi"]);
		expect(result.redirectOptions.stdout).toEqual(
			O.some({ path: "out.txt", mode: "overwrite" }),
		);
		expect(result.redirectOptions.stderr).toEqual(
			O.some({ path: "err.txt", mode: "overwrite" }),
		);
	});

	test("keeps the last redirect when the same stream is redirected twice", () => {
		expect(
			parseFirst("echo hi > a.txt > b.txt").redirectOptions.stdout,
		).toEqual(O.some({ path: "b.txt", mode: "overwrite" }));
	});

	test("keeps a quoted redirect target with spaces intact", () => {
		expect(
			parseFirst('echo hi > "my file.txt"').redirectOptions.stdout,
		).toEqual(O.some({ path: "my file.txt", mode: "overwrite" }));
	});
});

describe("parse errors", () => {
	test.each([
		">",
		"1>",
		">>",
		"1>>",
		"2>",
		"2>>",
	])("rejects a trailing '%s' with no target", (op) => {
		expectLeft(
			parser(`echo hi ${op}`, TEST_HOME),
			`syntax error: missing target for redirect '${op}'`,
		);
	});
});
