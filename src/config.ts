import * as core from '@actions/core';
import { ActionInputs } from './types';

function parseBoolean(val?: string): boolean {
  return val?.toLowerCase() === 'true' || val === '1';
}

export function getInputs(): ActionInputs {
  const offsetInput = core.getInput('offset') || '0';
  const verboseInput = core.getBooleanInput('verbose');
  const debugMode = (typeof core.isDebug === 'function' && core.isDebug()) ||
    parseBoolean(process.env.ACTIONS_STEP_DEBUG) ||
    parseBoolean(process.env.ACTIONS_RUNNER_DEBUG) ||
    parseBoolean(process.env.RUNNER_DEBUG);
  const verbose = verboseInput || debugMode;

  const offset = parseInt(offsetInput, 10);
  if (isNaN(offset)) {
    throw new Error(`Invalid offset value: "${offsetInput}". Offset must be an integer.`);
  }

  return { offset, verbose, debugMode };
}
