import * as core from "@actions/core";
import { getCommitInfo } from "./git";
import { ActionInputs } from "./types";
import { Logger } from "./logger";

/**
 * Main action entry point
 */
export async function run(): Promise<void> {
	try {
		// Parse inputs
		const offsetInput = core.getInput("offset") || "0";
		const verbose = core.getBooleanInput("verbose");
		
		// Parse and validate offset
		const offset = parseInt(offsetInput, 10);
		if (isNaN(offset)) {
			throw new Error(`Invalid offset value: "${offsetInput}". Offset must be an integer.`);
		}
		
		// Set ACTIONS_STEP_DEBUG if verbose is enabled
		// Note: This may not work if ACTIONS_STEP_DEBUG isn't set at workflow level
		// For reliable verbose output, we use Logger which uses core.info() when verbose is true
		if (verbose) {
			process.env.ACTIONS_STEP_DEBUG = "true";
		}
		
		const inputs: ActionInputs = {
			offset,
			verbose,
		};
		
		// Create logger instance
		const logger = new Logger(verbose);
		
		if (verbose) {
			logger.info("🔍 Verbose logging enabled");
		}
		logger.debug("Action inputs:");
		logger.debug(`  offset: ${inputs.offset}`);
		logger.debug(`  verbose: ${inputs.verbose}`);
		
		// Get commit information
		core.info(`Getting commit info for offset: ${offset}`);
		const commitInfo = await getCommitInfo(offset, logger);
		
		// Set outputs
		core.setOutput("sha", commitInfo.sha);
		core.setOutput("shortSha", commitInfo.shortSha);
		core.setOutput("message", commitInfo.message);
		core.setOutput("author", commitInfo.author);
		core.setOutput("authorEmail", commitInfo.authorEmail);
		core.setOutput("date", commitInfo.date);
		core.setOutput("dateISO", commitInfo.dateISO);
		
		// Log summary
		core.info("✅ Successfully retrieved commit information");
		core.info(`📊 Commit Info:`);
		core.info(`   SHA: ${commitInfo.sha}`);
		core.info(`   Short SHA: ${commitInfo.shortSha}`);
		core.info(`   Message: ${commitInfo.message}`);
		core.info(`   Author: ${commitInfo.author} <${commitInfo.authorEmail}>`);
		core.info(`   Date: ${commitInfo.dateISO}`);
		
		logger.debug("Action completed successfully");
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