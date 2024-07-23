import * as core from '@actions/core';
import * as github from '@actions/github';
import { check } from './checker.js';
import { Context } from './context.js';
import { diffRules } from './rule.js';
import { Predicator } from './types.js';
import { commitStatusPredicator, findBaseCommit } from './utils.js';

async function run() {
  try {
    const token = core.getInput('token', { required: true });
    const repo = github.context.repo;
    const octokit = github.getOctokit(token);

    const base = await findBaseCommit(octokit, repo, getBasePredicator());
    if (!base) {
      core.info(`not found base commit`);
      return;
    }
    const ctx = new Context(repo, base.sha, github.context.sha);

    core.info(`found base commit: ${base.sha}, comparing...`);
    const { data: diffs } = await octokit.rest.repos.compareCommits({
      ...repo,
      head: github.context.sha,
      base: base.sha,
    });
    core.info(`${diffs.files?.length} files changed`);

    const errors = await check(ctx, octokit, diffRules);
    await octokit.rest.repos.createCommitStatus({
      ...repo,
      sha: github.context.sha,
      context: 'candymint/release-check',
      state: errors?.length ? 'failure' : 'success',
      description: errors?.length ? `Found ${errors.length} errors` : 'All checks passed',
      target_url: `https://github.com/${repo.owner}/${repo.repo}/actions/runs/${github.context.runId}`,
    });
    errors?.forEach(err => core.setFailed(err.message));
  } catch (err) {
    core.setFailed(err as Error);
  }
}

run();

function getBasePredicator(): Predicator {
  const context = 'candymimt/published';
  const state = 'success';
  return commitStatusPredicator(status => status.context === context && status.state === state);
}
