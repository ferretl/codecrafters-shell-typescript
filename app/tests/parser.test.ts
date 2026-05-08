import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import * as O from "fp-ts/Option";
import parser from "../parser";
import { expectLeft, unwrapRight } from "./helpers";

const originalHome = process.env.HOME;
beforeAll(() => {
	process.env.HOME = "/home/test";
});
afterAll(() => {
	process.env.HOME = originalHome;
});

const parse = (line: string) => unwrapRight(parser(line));

describe("tokenization", () => {
	test("splits a simple command into name and args", () => {
		const result = parse("echo hello world");
		expect(result.name).toBe("echo");
		expect(result.args).toEqual(["hello", "world"]);
	});

	test("collapses runs of spaces", () => {
		const result = parse("echo   hello    world");
		expect(result.args).toEqual(["hello", "world"]);
	});

	test("treats tabs as separators", () => {
		const result = parse("echo\thello\tworld");
		expect(result.args).toEqual(["hello", "world"]);
	});

	test("returns an empty name for an empty line", () => {
		const result = parse("");
		expect(result.name).toBe("");
		expect(result.args).toEqual([]);
	});

	test("returns an empty name for a whitespace-only line", () => {
		const result = parse("   \t  ");
		expect(result.name).toBe("");
		expect(result.args).toEqual([]);
	});

	test("exposes no redirects on a plain command", () => {
		const result = parse("echo hello");
		expect(result.stdout).toEqual(O.none);
		expect(result.stderr).toEqual(O.none);
	});
});

describe("single quotes", () => {
	test("preserves spaces inside single quotes", () => {
		expect(parse("echo 'hello world'").args).toEqual(["hello world"]);
	});

	test("does not interpret escapes inside single quotes", () => {
		expect(parse("echo 'a\\nb'").args).toEqual(["a\\nb"]);
	});

	test("allows double quotes inside single quotes", () => {
		expect(parse(`echo 'say "hi"'`).args).toEqual(['say "hi"']);
	});

	test("joins adjacent single-quoted segments without spaces", () => {
		expect(parse("echo 'foo''bar'").args).toEqual(["foobar"]);
	});
});

describe("double quotes", () => {
	test("preserves spaces inside double quotes", () => {
		expect(parse('echo "hello world"').args).toEqual(["hello world"]);
	});

	test("escapes a double quote with backslash", () => {
		expect(parse('echo "say \\"hi\\""').args).toEqual(['say "hi"']);
	});

	test("escapes a backslash with backslash", () => {
		expect(parse('echo "a\\\\b"').args).toEqual(["a\\b"]);
	});

	test("preserves backslash before non-special chars inside double quotes", () => {
		expect(parse('echo "a\\nb"').args).toEqual(["a\\nb"]);
	});

	test("allows single quotes inside double quotes", () => {
		expect(parse(`echo "it's fine"`).args).toEqual(["it's fine"]);
	});
});

describe("backslash escapes outside quotes", () => {
	test("escapes a space into the same token", () => {
		expect(parse("echo hello\\ world").args).toEqual(["hello world"]);
	});

	test("escapes a quote literal", () => {
		expect(parse('echo \\"hi\\"').args).toEqual(['"hi"']);
	});

	test("escapes a backslash", () => {
		expect(parse("echo a\\\\b").args).toEqual(["a\\b"]);
	});
});

describe("tilde expansion", () => {
	test("expands a leading tilde to $HOME", () => {
		expect(parse("cd ~").args).toEqual(["/home/test"]);
	});

	test("does not expand a tilde mid-token", () => {
		expect(parse("echo a~b").args).toEqual(["a~b"]);
	});

	test("does not expand a tilde inside double quotes", () => {
		expect(parse('echo "~"').args).toEqual(["~"]);
	});

	test("does not expand a tilde inside single quotes", () => {
		expect(parse("echo '~'").args).toEqual(["~"]);
	});
});

describe("redirects", () => {
	test("parses > as stdout overwrite", () => {
		const result = parse("echo hi > out.txt");
		expect(result.args).toEqual(["hi"]);
		expect(result.stdout).toEqual(
			O.some({ path: "out.txt", mode: "overwrite" }),
		);
		expect(result.stderr).toEqual(O.none);
	});

	test("parses 1> as stdout overwrite", () => {
		expect(parse("echo hi 1> out.txt").stdout).toEqual(
			O.some({ path: "out.txt", mode: "overwrite" }),
		);
	});

	test("parses >> as stdout append", () => {
		expect(parse("echo hi >> out.txt").stdout).toEqual(
			O.some({ path: "out.txt", mode: "append" }),
		);
	});

	test("parses 1>> as stdout append", () => {
		expect(parse("echo hi 1>> out.txt").stdout).toEqual(
			O.some({ path: "out.txt", mode: "append" }),
		);
	});

	test("parses 2> as stderr overwrite", () => {
		const result = parse("echo hi 2> err.txt");
		expect(result.stderr).toEqual(
			O.some({ path: "err.txt", mode: "overwrite" }),
		);
		expect(result.stdout).toEqual(O.none);
	});

	test("parses 2>> as stderr append", () => {
		expect(parse("echo hi 2>> err.txt").stderr).toEqual(
			O.some({ path: "err.txt", mode: "append" }),
		);
	});

	test("parses both stdout and stderr redirects together", () => {
		const result = parse("echo hi > out.txt 2> err.txt");
		expect(result.args).toEqual(["hi"]);
		expect(result.stdout).toEqual(
			O.some({ path: "out.txt", mode: "overwrite" }),
		);
		expect(result.stderr).toEqual(
			O.some({ path: "err.txt", mode: "overwrite" }),
		);
	});

	test("keeps the last redirect when the same stream is redirected twice", () => {
		expect(parse("echo hi > a.txt > b.txt").stdout).toEqual(
			O.some({ path: "b.txt", mode: "overwrite" }),
		);
	});

	test("keeps a quoted redirect target with spaces intact", () => {
		expect(parse('echo hi > "my file.txt"').stdout).toEqual(
			O.some({ path: "my file.txt", mode: "overwrite" }),
		);
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
			parser(`echo hi ${op}`),
			`syntax error: missing target for redirect '${op}'`,
		);
	});
});
