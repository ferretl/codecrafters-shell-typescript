import { afterEach, describe, expect, test } from "bun:test";
import { spawn } from "node:child_process";
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

type ShellRun = {
	stdout: string;
	stderr: string;
	exitCode: number;
};

const runShell = async (input: string): Promise<ShellRun> => {
	const child = spawn("bun", ["run", "app/main.ts"], {
		stdio: ["pipe", "pipe", "pipe"],
	});
	child.stdin.end(input);

	const [stdoutChunks, stderrChunks, exitCode] = await Promise.all([
		child.stdout.toArray(),
		child.stderr.toArray(),
		new Promise<number>((resolve) =>
			child.on("close", (code) => resolve(code ?? 0)),
		),
	]);

	return {
		stdout: stdoutChunks.join(""),
		stderr: stderrChunks.join(""),
		exitCode,
	};
};

const tmpPath = (label: string): string =>
	join(tmpdir(), `shell-pipeline-${label}-${Date.now()}-${Math.random()}.txt`);

const cleanupPaths: string[] = [];
const tempFile = (label: string): string => {
	const path = tmpPath(label);
	cleanupPaths.push(path);
	return path;
};
afterEach(() => {
	while (cleanupPaths.length > 0) {
		const path = cleanupPaths.pop();
		if (path && existsSync(path)) unlinkSync(path);
	}
});

describe("pipeline execution", () => {
	test("simple pipe forwards stdout to stdin", async () => {
		const { stdout } = await runShell("echo hello | cat\nexit\n");
		expect(stdout).toContain("hello\n");
	});

	test("three-segment pipeline threads data through every segment", async () => {
		const { stdout } = await runShell("echo hello world | cat | wc -w\nexit\n");
		expect(stdout).toMatch(/\b2\b/);
	});

	test("intermediate redirect short-circuits the pipe", async () => {
		const path = tempFile("intermediate");
		const { stdout } = await runShell(`echo hi > ${path} | cat\nexit\n`);
		expect(readFileSync(path, "utf-8")).toBe("hi\n");
		expect(stdout).not.toContain("hi\n");
	});

	test("stderr from a segment does not flow down the pipe", async () => {
		const { stdout, stderr } = await runShell(
			"ls /nonexistent_pipeline_path | cat\nexit\n",
		);
		expect(stderr).toContain("nonexistent_pipeline_path");
		expect(stdout).not.toContain("nonexistent_pipeline_path");
	});

	test("unknown command mid-pipeline reports error and pipeline drains", async () => {
		const { stdout, stderr } = await runShell(
			"echo hi | nonexistent_pipeline_cmd | cat\nexit\n",
		);
		expect(stderr).toContain("nonexistent_pipeline_cmd: command not found");
		expect(stdout).not.toContain("hi\n");
	});

	test("blank pipeline produces no error", async () => {
		const { stderr, exitCode } = await runShell("\nexit\n");
		expect(stderr).toBe("");
		expect(exitCode).toBe(0);
	});

	test("exit signal from the last segment terminates the shell", async () => {
		const { exitCode } = await runShell("exit 5\n");
		expect(exitCode).toBe(5);
	});
});

describe("background jobs", () => {
	test("prints the job number and pid when starting a background job", async () => {
		const { stdout } = await runShell("sleep 5 &\nexit\n");
		expect(stdout).toMatch(/\[1\] \d+/);
	});

	test("reports a finished job as Done before the next prompt without jobs", async () => {
		const { stdout } = await runShell("sleep 1 &\nsleep 2\nexit\n");
		expect(stdout).toMatch(/\[1\]\+ {2}Done {20}sleep 1\b/);
		expect(stdout).not.toMatch(/Done.*sleep 1 &/);
	});
});
