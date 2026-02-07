import * as core from '@actions/core';
import { ActionInputs } from './types';

export function getInputs(): ActionInputs {
  const offsetInput = core.getInput('offset') || '0';
  const verboseInput = core.getBooleanInput('verbose');
  const envStepDebug = (process.env.ACTIONS_STEP_DEBUG || '').toLowerCase();
  const stepDebugEnabled = (typeof core.isDebug === 'function' && core.isDebug()) || envStepDebug === 'true' || envStepDebug === '1';
  const verbose = verboseInput || stepDebugEnabled;

  const offset = parseInt(offsetInput, 10);
  if (isNaN(offset)) {
    throw new Error(`Invalid offset value: "${offsetInput}". Offset must be an integer.`);
  }

  return { offset, verbose };
}
