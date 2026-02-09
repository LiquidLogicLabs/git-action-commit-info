import * as core from "@actions/core";
import { getInputs } from "./config";
import { getCommitInfo } from "./git";
import { Logger } from "./logger";

/**
 * Main action entry point
 */
export async function run(): Promise<void> {
	try {
		const inputs = getInputs();

		// Create logger instance
		const logger = new Logger(inputs.verbose, inputs.debugMode);

		if (inputs.verbose) {
			logger.info("Verbose logging enabled");
		}
		if (inputs.debugMode) {
			logger.info("Debug mode enabled");
		}
		logger.verboseInfo("Action inputs:");
		logger.verboseInfo(`  offset: ${inputs.offset}`);
		logger.verboseInfo(`  verbose: ${inputs.verbose}`);
		logger.verboseInfo(`  debugMode: ${inputs.debugMode}`);

		// Get commit information
		logger.info(`Getting commit info for offset: ${inputs.offset}`);
		const commitInfo = await getCommitInfo(inputs.offset, logger);

		// Set outputs
		core.setOutput("sha", commitInfo.sha);
		core.setOutput("short-sha", commitInfo.shortSha);
		core.setOutput("message", commitInfo.message);
		core.setOutput("message-raw", commitInfo.messageRaw);
		core.setOutput("author", commitInfo.author);
		core.setOutput("author-email", commitInfo.authorEmail);
		core.setOutput("date", commitInfo.date);
		core.setOutput("date-iso", commitInfo.dateISO);

		// Log summary
		logger.info("Successfully retrieved commit information");
		logger.info(`Commit Info:`);
		logger.info(`   SHA: ${commitInfo.sha}`);
		logger.info(`   Short SHA: ${commitInfo.shortSha}`);
		logger.info(`   Message: ${commitInfo.message}`);
		logger.info(`   Author: ${commitInfo.author} <${commitInfo.authorEmail}>`);
		logger.info(`   Date: ${commitInfo.dateISO}`);

		logger.verboseInfo("Action completed successfully");
	} catch (error) {
		if (error instanceof Error) {
			core.error(error.message);
			core.setFailed(error.message);
		} else {
			const message = "Unknown error occurred";
			core.error(message);
			core.setFailed(message);
		}
	}
}

// Run the action (only when executed directly, not when imported for testing)
if (require.main === module) {
	run();
}
