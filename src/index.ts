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
		const verboseInput = core.getBooleanInput("verbose");
		const envStepDebug = (process.env.ACTIONS_STEP_DEBUG || "").toLowerCase();
		const stepDebugEnabled = (typeof core.isDebug === "function" && core.isDebug()) || envStepDebug === "true" || envStepDebug === "1";
		const verbose = verboseInput || stepDebugEnabled;
		
		// Parse and validate offset
		const offset = parseInt(offsetInput, 10);
		if (isNaN(offset)) {
			throw new Error(`Invalid offset value: "${offsetInput}". Offset must be an integer.`);
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
		logger.info(`Getting commit info for offset: ${offset}`);
		const commitInfo = await getCommitInfo(offset, logger);
		
		// Set outputs
		core.setOutput("sha", commitInfo.sha);
		core.setOutput("shortSha", commitInfo.shortSha);
		core.setOutput("message", commitInfo.message);
		core.setOutput("messageRaw", commitInfo.messageRaw);
		core.setOutput("author", commitInfo.author);
		core.setOutput("authorEmail", commitInfo.authorEmail);
		core.setOutput("date", commitInfo.date);
		core.setOutput("dateISO", commitInfo.dateISO);
		
		// Log summary
		logger.info("✅ Successfully retrieved commit information");
		logger.info(`📊 Commit Info:`);
		logger.info(`   SHA: ${commitInfo.sha}`);
		logger.info(`   Short SHA: ${commitInfo.shortSha}`);
		logger.info(`   Message: ${commitInfo.message}`);
		logger.info(`   Author: ${commitInfo.author} <${commitInfo.authorEmail}>`);
		logger.info(`   Date: ${commitInfo.dateISO}`);
		
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