import * as github from '@actions/github';
import { RestEndpointMethodTypes } from '@octokit/rest';

export type OctokitClient = ReturnType<typeof github.getOctokit>;

export type Diff = NonNullable<RestEndpointMethodTypes['repos']['compareCommits']['response']['data']['files']>[number];

export type Repo = typeof github.context.repo;

export type Commit = RestEndpointMethodTypes['repos']['listCommits']['response']['data'][number];

export type CommitStatus = RestEndpointMethodTypes['repos']['listCommitStatusesForRef']['response']['data'][number];

export type Check = RestEndpointMethodTypes['checks']['listForRef']['response']['data']['check_runs'][number];

export type Predicator = (octokit: OctokitClient, repo: Repo, commit: Commit) => Promise<boolean>;

export type FileContent = RestEndpointMethodTypes['repos']['getContent']['response']['data'];
