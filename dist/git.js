"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCommitInfo = getCommitInfo;
const exec_1 = require("@actions/exec");
const path = __importStar(require("path"));
/**
 * Gets the working directory for git commands
 * Uses GIT_WORKING_DIRECTORY env var if set (for tests), otherwise uses process.cwd()
 * Always returns an absolute path (required by @actions/exec)
 */
function getGitWorkingDirectory() {
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
async function getCommitInfo(offset, logger) {
    // Handle negative offsets by converting to absolute value (git doesn't support negative offsets natively)
    const absOffset = Math.abs(offset);
    // Build git reference: HEAD for offset 0, HEAD~{offset} for others
    const gitRef = absOffset === 0 ? "HEAD" : `HEAD~${absOffset}`;
    logger.debug(`Getting commit info for offset ${offset} (git ref: ${gitRef})`);
    const cwd = getGitWorkingDirectory();
    logger.debug(`Using git working directory: ${cwd}`);
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
            stdout: (data) => {
                output += data.toString();
            },
        },
        silent: !logger.isVerbose(),
        cwd,
    };
    try {
        await (0, exec_1.exec)("git", ["log", "-1", "--format=%H|%h|%s|%an|%ae|%ai|%ci", gitRef], options);
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
                stdout: (data) => {
                    messageRawOutput += data.toString();
                },
            },
            silent: !logger.isVerbose(),
            cwd,
        };
        await (0, exec_1.exec)("git", ["log", "-1", "--format=%B", gitRef], messageRawOptions);
        const messageRaw = messageRawOutput.trim();
        logger.debug(`Resolved commit SHA: ${sha}`);
        logger.debug(`Short SHA: ${shortSha}`);
        logger.debug(`Message: ${message}`);
        logger.debug(`Message (full): ${messageRaw.split('\n').length} lines`);
        logger.debug(`Author: ${author} <${authorEmail}>`);
        logger.debug(`Date: ${committerDate}`);
        logger.debug(`Resolved commit info: SHA=${sha}, shortSha=${shortSha}, message=${message}`);
        const commitInfo = {
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
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error occurred";
        if (message.includes("ambiguous argument") || message.includes("unknown revision")) {
            throw new Error(`Commit not found for offset ${offset} (git ref: ${gitRef}). Offset may exceed commit history.`);
        }
        throw new Error(`Failed to get commit info for offset ${offset} (git ref: ${gitRef}): ${message}`);
    }
}
//# sourceMappingURL=git.js.map