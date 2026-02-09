import { exec } from "@actions/exec";
import * as path from "path";
import { CommitInfo } from "./types";
import { Logger } from "./logger";

/**
 * Gets the working directory for git commands
 * Uses GIT_WORKING_DIRECTORY env var if set (for tests), otherwise uses process.cwd()
 * Always returns an absolute path (required by @actions/exec)
 */
function getGitWorkingDirectory(): string {
	const cwd = process.env.GIT_WORKING_DIRECTORY || process.cwd();
	// Ensure we return an absolute path (required by @actions/exec)
	return path.isAbsolute(cwd) ? cwd : path.resolve(cwd);
}

/**
 * Gets commit information for a given offset from HEAD
 * @param offset Offset from HEAD (0 = HEAD, 1 = HEAD~1, etc.). Negative offsets are converted to absolute value.
 * @param logger Logger instance for logging
 * @returns CommitInfo object with commit details
 */
export async function getCommitInfo(offset: number, logger: Logger): Promise<CommitInfo> {
	// Handle negative offsets by converting to absolute value (git doesn't support negative offsets natively)
	const absOffset = Math.abs(offset);
	
	// Build git reference: HEAD for offset 0, HEAD~{offset} for others
	const gitRef = absOffset === 0 ? "HEAD" : `HEAD~${absOffset}`;
	
	logger.verboseInfo(`Getting commit info for offset ${offset} (git ref: ${gitRef})`);

	const cwd = getGitWorkingDirectory();
	logger.verboseInfo(`Using git working directory: ${cwd}`);
	
	// Use git log to get all commit info in one call with pipe-delimited format
	// Format: %H|%h|%s|%an|%ae|%ai|%ci
	// %H: full SHA (40 chars)
	// %h: short SHA (7 chars)
	// %s: subject (commit message first line)
	// %an: author name
	// %ae: author email
	// %ai: author date (ISO format)
	// %ci: committer date (ISO format)
	let output = "";
	const options = {
		listeners: {
			stdout: (data: Buffer) => {
				output += data.toString();
			},
		},
		silent: !logger.isVerbose(),
		cwd,
	};
	
	try {
		await exec("git", ["log", "-1", "--format=%H|%h|%s|%an|%ae|%ai|%ci", gitRef], options);
		const result = output.trim();
		
		if (!result) {
			throw new Error(`No commit found for offset ${offset} (git ref: ${gitRef})`);
		}
		
		// Parse pipe-delimited output
		const parts = result.split("|");
		if (parts.length !== 7) {
			throw new Error(`Unexpected git log format: ${result}`);
		}
		
		const [sha, shortSha, message, author, authorEmail, authorDate, committerDate] = parts;
		
		// Validate SHA format
		if (!sha || sha.length !== 40) {
			throw new Error(`Invalid commit SHA format: ${sha}`);
		}
		
		// Get full commit message (can contain newlines and special characters)
		let messageRawOutput = "";
		const messageRawOptions = {
			listeners: {
				stdout: (data: Buffer) => {
					messageRawOutput += data.toString();
				},
			},
			silent: !logger.isVerbose(),
			cwd,
		};
		
		await exec("git", ["log", "-1", "--format=%B", gitRef], messageRawOptions);
		const messageRaw = messageRawOutput.trim();
		
		logger.verboseInfo(`Resolved commit SHA: ${sha}`);
		logger.verboseInfo(`Short SHA: ${shortSha}`);
		logger.verboseInfo(`Message: ${message}`);
		logger.verboseInfo(`Message (full): ${messageRaw.split('\n').length} lines`);
		logger.verboseInfo(`Author: ${author} <${authorEmail}>`);
		logger.verboseInfo(`Date: ${committerDate}`);
		logger.debug(`Resolved commit info: SHA=${sha}, shortSha=${shortSha}, message=${message}`);
		
		const commitInfo: CommitInfo = {
			sha,
			shortSha,
			message,
			messageRaw,
			author,
			authorEmail,
			date: committerDate,
			dateISO: committerDate, // Already in ISO format from git
		};
		
		return commitInfo;
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error occurred";
		if (message.includes("ambiguous argument") || message.includes("unknown revision")) {
			throw new Error(`Commit not found for offset ${offset} (git ref: ${gitRef}). Offset may exceed commit history.`);
		}
		throw new Error(`Failed to get commit info for offset ${offset} (git ref: ${gitRef}): ${message}`);
	}
}