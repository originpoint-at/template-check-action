import * as core from '@actions/core';
import * as github from '@actions/github';
import { checkDiff } from './check-diff.js';
import { checkRepo } from './check-repo';
import { Context } from './context.js';
import { Checker } from './types';

async function run() {
  try {
    const repo = getRepo(core.getInput('repo', { required: true }));
    const base = core.getInput('base');
    const head = core.getInput('head', { required: true });
    const token = core.getInput('token', { required: true });
    const repoPath = core.getInput('repoPath', { required: true });
    const onChainStorageLimit = core.getInput('onChainStorageLimit');

    const octokit = github.getOctokit(token);
    const ctx = new Context({
      repo,
      base,
      head,
      repoPath,
      onChainStorageLimit: onChainStorageLimit ? Number(onChainStorageLimit) : undefined,
    });
    core.info(`context created: ${JSON.stringify(ctx)}`);
    const checks: Checker[] = [checkRepo];
    if (base && head) {
      checks.push(checkDiff);
    }

    const errors: any[] = [];
    const outputs: Record<string, any> = {};

    await Promise.all(checks.map(async (check) => {
      const result = await check(ctx, octokit);
      errors.push(...result.errors);
      Object.assign(outputs, result.outputs);
    }));
    outputs.results = errors;
    errors.map(error => {
      core.setFailed(error.message);
    });
    for (const [key, value] of Object.entries(outputs)) {
      core.setOutput(key, value);
    }
  } catch (err) {
    core.setFailed(err as Error);
  }
}

function getRepo(repoInput: string) {
  const [owner, repo] = repoInput.split('/');
  return { owner, repo };
}

run();
