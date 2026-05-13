import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { listFilesInDir } from "../../completion/listings";

describe("listFilesInDir", () => {
	const tmpDir = path.join(
		os.tmpdir(),
		`completion-test-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
	);

	beforeEach(() => {
		fs.mkdirSync(tmpDir, { recursive: true });
	});

	afterEach(() => {
		test("returns the files present in the directory", () => {
			fs.writeFileSync(path.join(tmpDir, "a.txt"), "");
			fs.writeFileSync(path.join(tmpDir, "b.txt"), "");

			expect([...listFilesInDir(tmpDir)].sort()).toEqual(["a.txt", "b.txt"]);
		});

		test("returns an empty array for an empty directory", () => {
			expect([...listFilesInDir(tmpDir)]).toEqual([]);
		});

		test("returns an empty array for a directory that does not exist", () => {
			expect([...listFilesInDir(path.join(tmpDir, "missing"))]).toEqual([]);
		});

		test("includes subdirectories alongside files", () => {
			fs.mkdirSync(path.join(tmpDir, "subdir"));
			fs.writeFileSync(path.join(tmpDir, "file.txt"), "");

			expect([...listFilesInDir(tmpDir)].sort()).toEqual([
				"file.txt",
				"subdir",
			]);
		});

		expect([...listFilesInDir(tmpDir)].sort()).toEqual(["file.txt", "subdir"]);
	});
});
