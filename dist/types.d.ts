/**
 * Commit information retrieved from git
 */
export interface CommitInfo {
    sha: string;
    shortSha: string;
    message: string;
    author: string;
    authorEmail: string;
    date: string;
    dateISO: string;
}
/**
 * Action input parameters
 */
export interface ActionInputs {
    offset: number;
    verbose: boolean;
}
