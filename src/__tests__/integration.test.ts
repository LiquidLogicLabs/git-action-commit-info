import { exec } from "@actions/exec";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Store original environment and working directory
const originalEnv = { ...process.env };
const originalCwd = process.cwd();
let tempRepoDir: string | null = null;

// Mock @actions/core to capture outputs
const mockSetOutput = jest.fn();
const mockInfo = jest.fn((msg: string) => console.log(`ℹ️  ${msg}`));
const mockDebug = jest.fn((msg: string) => console.log(`🐛 ${msg}`));
const mockWarning = jest.fn((msg: string) => console.warn(`⚠️  ${msg}`));
const mockError = jest.fn((msg: string) => console.error(`❌ ${msg}`));
const mockSetFailed = jest.fn((msg: string) => {
	console.error(`💥 ${msg}`);
	throw new Error(msg);
});

jest.mock("@actions/core", () => ({
	getInput: jest.fn((name: string, options?: { required?: boolean }) => {
		const envKey = `INPUT_${name.toUpperCase()}`;
		const value = process.env[envKey] || "";
		if (options?.required && !value) {
			throw new Error(`Input required and not supplied: ${name}`);
		}
		return value;
	}),
	getBooleanInput: jest.fn((name: string) => {
		const envKey = `INPUT_${name.toUpperCase()}`;
		const value = process.env[envKey] || "false";
		return value === "true";
	}),
	setOutput: mockSetOutput,
	info: mockInfo,
	debug: mockDebug,
	warning: mockWarning,
	error: mockError,
	setFailed: mockSetFailed,
}));

// Helper functions for git operations (all run in temp repo)
function runGitSync(args: string[], cwd?: string): string {
	const workDir = cwd || tempRepoDir || process.cwd();
	if (!workDir) {
		throw new Error("No working directory specified for git command");
	}
	try {
		const { execFileSync } = require("child_process");
		const result = execFileSync("git", args, {
			encoding: "utf-8",
			cwd: workDir,
			stdio: ["pipe", "pipe", "pipe"], // Suppress stderr to avoid noise
		});
		return result ? result.toString().trim() : "";
	} catch (error: any) {
		if (process.env.DEBUG_TESTS) {
			console.error(`Git command failed: git ${args.join(" ")} in ${workDir}:`, error.message);
		}
		throw error;
	}
}

// Helper to get commit SHA for a reference
function getCommitSha(ref: string): string {
	return runGitSync(["rev-parse", ref], tempRepoDir!);
}

// Helper to get commit info using git log
function getCommitInfoGit(ref: string): {
	sha: string;
	shortSha: string;
	message: string;
	messageRaw: string;
	author: string;
	authorEmail: string;
	date: string;
} {
	const output = runGitSync(
		["log", "-1", "--format=%H|%h|%s|%an|%ae|%ci", ref],
		tempRepoDir!
	);
	const [sha, shortSha, message, author, authorEmail, date] = output.split("|");
	
	// Get full commit message
	const messageRaw = runGitSync(
		["log", "-1", "--format=%B", ref],
		tempRepoDir!
	).trim();
	
	return { sha, shortSha, message, messageRaw, author, authorEmail, date };
}

// Helper to create a commit
function createCommit(message: string, fileName?: string, content?: string): string {
	if (!tempRepoDir) {
		throw new Error("Temp repo not initialized");
	}
	
	if (fileName && content !== undefined) {
		fs.writeFileSync(path.join(tempRepoDir, fileName), content);
		runGitSync(["add", fileName], tempRepoDir);
	}
	
	runGitSync(["commit", "-m", message], tempRepoDir);
	return getCommitSha("HEAD");
}

// Import the action run function (after mocks are set up)
import { run as runAction } from "../index";

describe("Integration Tests", () => {
	// Store commit SHAs for verification
	const commitShas: string[] = [];

	beforeAll(async () => {
		// Create temporary directory for test repository
		tempRepoDir = fs.mkdtempSync(path.join(os.tmpdir(), "git-commit-info-test-"));

		// Initialize git repository
		runGitSync(["init"], tempRepoDir);
		runGitSync(["config", "user.name", "Test User"], tempRepoDir);
		runGitSync(["config", "user.email", "test@example.com"], tempRepoDir);

		// Create multiple commits for testing offsets
		commitShas.push(createCommit("Initial commit", "README.md", "# Test Repository\n"));
		commitShas.push(createCommit("Second commit", "file1.txt", "Content 1\n"));
		commitShas.push(createCommit("Third commit", "file2.txt", "Content 2\n"));
		commitShas.push(createCommit("Fourth commit", "file3.txt", "Content 3\n"));

		// Verify commits were created
		const headSha = getCommitSha("HEAD");
		expect(headSha).toBe(commitShas[3]); // HEAD should point to the most recent commit (last in array)

		// Change to temp directory for tests
		process.chdir(tempRepoDir);
		process.env.GIT_WORKING_DIRECTORY = tempRepoDir;
	});

	afterAll(() => {
		// Restore original working directory
		process.chdir(originalCwd);
		delete process.env.GIT_WORKING_DIRECTORY;

		// Clean up temporary repository
		if (tempRepoDir && fs.existsSync(tempRepoDir)) {
			fs.rmSync(tempRepoDir, { recursive: true, force: true });
		}
	});

	beforeEach(() => {
		jest.clearAllMocks();
		process.env = { ...originalEnv };
		// Ensure we're in the temp repo for each test
		if (tempRepoDir) {
			process.chdir(tempRepoDir);
			process.env.GIT_WORKING_DIRECTORY = tempRepoDir;
		}
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	test("Test 1: Get commit info for HEAD (offset 0)", async () => {
		console.log("\n🔍 Test 1: Get commit info for HEAD (offset 0)");

		process.env.INPUT_OFFSET = "0";
		process.env.INPUT_VERBOSE = "false";

		await runAction();

		// Verify outputs - offset 0 should get HEAD (most recent commit, index 3)
		const expectedInfo = getCommitInfoGit("HEAD");
		expect(mockSetOutput).toHaveBeenCalledWith("sha", commitShas[3]);
		expect(mockSetOutput).toHaveBeenCalledWith("shortSha", commitShas[3].substring(0, 7));
		expect(mockSetOutput).toHaveBeenCalledWith("message", "Fourth commit");
		expect(mockSetOutput).toHaveBeenCalledWith("messageRaw", expectedInfo.messageRaw);
		expect(mockSetOutput).toHaveBeenCalledWith("author", "Test User");
		expect(mockSetOutput).toHaveBeenCalledWith("authorEmail", "test@example.com");
		expect(mockSetOutput).toHaveBeenCalledWith("date", expect.any(String));
		expect(mockSetOutput).toHaveBeenCalledWith("dateISO", expect.any(String));

		console.log("✅ Commit info for HEAD retrieved correctly");
	});

	test("Test 2: Get commit info for HEAD~1 (offset 1)", async () => {
		console.log("\n🔍 Test 2: Get commit info for HEAD~1 (offset 1)");

		process.env.INPUT_OFFSET = "1";
		process.env.INPUT_VERBOSE = "false";

		await runAction();

		// Verify outputs - should get the third commit
		const expectedInfo = getCommitInfoGit("HEAD~1");
		expect(mockSetOutput).toHaveBeenCalledWith("sha", expectedInfo.sha);
		expect(mockSetOutput).toHaveBeenCalledWith("shortSha", expectedInfo.shortSha);
		expect(mockSetOutput).toHaveBeenCalledWith("message", expectedInfo.message);
		expect(mockSetOutput).toHaveBeenCalledWith("messageRaw", expectedInfo.messageRaw);
		expect(mockSetOutput).toHaveBeenCalledWith("author", expectedInfo.author);
		expect(mockSetOutput).toHaveBeenCalledWith("authorEmail", expectedInfo.authorEmail);

		console.log("✅ Commit info for HEAD~1 retrieved correctly");
	});

	test("Test 3: Get commit info for HEAD~2 (offset 2)", async () => {
		console.log("\n🔍 Test 3: Get commit info for HEAD~2 (offset 2)");

		process.env.INPUT_OFFSET = "2";
		process.env.INPUT_VERBOSE = "false";

		await runAction();

		// Verify outputs - should get the second commit
		const expectedInfo = getCommitInfoGit("HEAD~2");
		expect(mockSetOutput).toHaveBeenCalledWith("sha", expectedInfo.sha);
		expect(mockSetOutput).toHaveBeenCalledWith("shortSha", expectedInfo.shortSha);
		expect(mockSetOutput).toHaveBeenCalledWith("message", expectedInfo.message);
		expect(mockSetOutput).toHaveBeenCalledWith("messageRaw", expectedInfo.messageRaw);

		console.log("✅ Commit info for HEAD~2 retrieved correctly");
	});

	test("Test 4: Get commit info with negative offset (-1)", async () => {
		console.log("\n🔍 Test 4: Get commit info with negative offset (-1)");

		process.env.INPUT_OFFSET = "-1";
		process.env.INPUT_VERBOSE = "false";

		await runAction();

		// Negative offsets are converted to absolute value, so -1 should be same as 1
		const expectedInfo = getCommitInfoGit("HEAD~1");
		expect(mockSetOutput).toHaveBeenCalledWith("sha", expectedInfo.sha);
		expect(mockSetOutput).toHaveBeenCalledWith("shortSha", expectedInfo.shortSha);
		expect(mockSetOutput).toHaveBeenCalledWith("message", expectedInfo.message);
		expect(mockSetOutput).toHaveBeenCalledWith("messageRaw", expectedInfo.messageRaw);

		console.log("✅ Commit info with negative offset retrieved correctly");
	});

	test("Test 5: Get commit info with verbose logging", async () => {
		console.log("\n🔍 Test 5: Get commit info with verbose logging");

		process.env.INPUT_OFFSET = "0";
		process.env.INPUT_VERBOSE = "true";

		await runAction();

		// Verify outputs - offset 0 should get HEAD (most recent commit, index 3)
		const expectedInfo = getCommitInfoGit("HEAD");
		expect(mockSetOutput).toHaveBeenCalledWith("sha", commitShas[3]);
		expect(mockSetOutput).toHaveBeenCalledWith("shortSha", commitShas[3].substring(0, 7));
		expect(mockSetOutput).toHaveBeenCalledWith("message", "Fourth commit");
		expect(mockSetOutput).toHaveBeenCalledWith("messageRaw", expectedInfo.messageRaw);

		// Verify verbose logging was used
		expect(mockInfo).toHaveBeenCalledWith(expect.stringContaining("Verbose logging enabled"));

		console.log("✅ Commit info with verbose logging retrieved correctly");
	});

	test("Test 6: Error handling for invalid offset", async () => {
		console.log("\n🔍 Test 6: Error handling for invalid offset");

		process.env.INPUT_OFFSET = "invalid";
		process.env.INPUT_VERBOSE = "false";

		await expect(runAction()).rejects.toThrow();

		expect(mockSetFailed).toHaveBeenCalledWith(expect.stringContaining("Invalid offset value"));

		console.log("✅ Error handling for invalid offset works correctly");
	});

	test("Test 7: Error handling for offset exceeding history", async () => {
		console.log("\n🔍 Test 7: Error handling for offset exceeding history");

		process.env.INPUT_OFFSET = "100"; // Way beyond our commit history
		process.env.INPUT_VERBOSE = "false";

		await expect(runAction()).rejects.toThrow();

		expect(mockSetFailed).toHaveBeenCalledWith(expect.stringContaining("Failed to get commit info"));

		console.log("✅ Error handling for offset exceeding history works correctly");
	});

	test("Test 8: Default offset (0) when not provided", async () => {
		console.log("\n🔍 Test 8: Default offset (0) when not provided");

		// Don't set INPUT_OFFSET
		delete process.env.INPUT_OFFSET;
		process.env.INPUT_VERBOSE = "false";

		await runAction();

		// Should default to offset 0 (HEAD - most recent commit, index 3)
		const expectedInfo = getCommitInfoGit("HEAD");
		expect(mockSetOutput).toHaveBeenCalledWith("sha", commitShas[3]);
		expect(mockSetOutput).toHaveBeenCalledWith("message", "Fourth commit");
		expect(mockSetOutput).toHaveBeenCalledWith("messageRaw", expectedInfo.messageRaw);

		console.log("✅ Default offset works correctly");
	});
});