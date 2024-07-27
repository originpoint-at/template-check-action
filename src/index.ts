import * as core from '@actions/core';
import * as github from '@actions/github';
import { check } from './checker.js';
import { Context } from './context.js';
import { diffRules } from './rule.js';

async function run() {
  try {
    const repo = getRepo(core.getInput('repo', { required: true }));
    const base = core.getInput('base');
    const head = core.getInput('head', { required: true });
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

    const errors = await check(ctx, octokit, diffRules);
    core.setOutput('results', errors);
  } catch (err) {
    core.setFailed(err as Error);
  }
}

function getRepo(repoInput: string) {
  const [owner, repo] = repoInput.split('/');
  return { owner, repo };
}

run();
