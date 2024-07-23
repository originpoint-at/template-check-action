import * as core from '@actions/core';
import { Commit, CommitStatus, OctokitClient, Repo } from './types.js';

export async function findBaseCommit(
  octokit: OctokitClient,
  repo: Repo,
  predicate: (octokit: OctokitClient, repo: Repo, commit: Commit) => Promise<boolean>,
  branch?: string,
) {
  core.info(`finding base...`);
  for await (const commit of commitIterator(octokit, repo, branch)) {
    core.debug(`${commit.sha}: ${commit.commit.message}`);
    if (await predicate(octokit, repo, commit)) {
      return commit;
    }
  }
}

export async function* commitIterator(octokit: OctokitClient, repo: Repo, branch?: string) {
  let page = 1;
  let commits: Commit[] = [];
  let index = 0;
  while (true) {
    if (index === commits.length) {
      const { data } = await octokit.rest.repos.listCommits({
        ...repo,
        per_page: 100,
        page,
        sha: branch,
      });
      commits = data;
      index = 0;
      page++;
    }
    if (commits.length === 0) {
      break;
    }
    yield commits[index++];
  }
}

export function commitStatusPredicator(checkPredicator: (status: CommitStatus) => boolean) {
  return async (octokit: OctokitClient, repo: Repo, commit: Commit) => {
    const { data: statuses } = await octokit.rest.repos.listCommitStatusesForRef({
      ...repo,
      ref: commit.sha,
    });
    return !!statuses.find(checkPredicator);
  };
}
