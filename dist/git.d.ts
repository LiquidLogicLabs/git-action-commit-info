import { CommitInfo } from "./types";
import { Logger } from "./logger";
/**
 * Gets commit information for a given offset from HEAD
 * @param offset Offset from HEAD (0 = HEAD, 1 = HEAD~1, etc.). Negative offsets are converted to absolute value.
 * @param logger Logger instance for logging
 * @returns CommitInfo object with commit details
 */
export declare function getCommitInfo(offset: number, logger: Logger): Promise<CommitInfo>;
