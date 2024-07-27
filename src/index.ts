import * as core from '@actions/core';
import * as github from '@actions/github';
import { check } from './checker.js';
import { Context } from './context.js';
import { diffRules } from './rule.js';

async function run() {
  try {
    const repo = getRepo(core.getInput('repo'));
    const base = core.getInput('base');
    const head = core.getInput('head');
    const token = core.getInput('token', { required: true });
    if (!base) {
      core.info(`base is not set, skip`);
      return;
    }

    const octokit = github.getOctokit(token);
    const ctx = new Context(repo, base, head);

    core.info(`compare ${base}...${head}`);
    const { data: diffs } = await octokit.rest.repos.compareCommits({
      ...repo,
      head,
      base,
    });
    core.info(`${diffs.files?.length} files changed`);

    for await (const err of check(ctx, octokit, diffRules)) {
      core.setFailed(err.message);
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
