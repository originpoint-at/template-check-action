import * as core from '@actions/core';
import { Context } from './context';
import { DiffRule } from './rule';
import { Diff, OctokitClient } from './types';

type Error = {
  filename: string;
  rule: DiffRule;
  message: string;
};

export async function check(ctx: Context, octokit: OctokitClient, rules: DiffRule[]): Promise<Error[] | undefined> {
  const { data: diffs } = await octokit.rest.repos.compareCommits({
    ...ctx.repo,
    head: ctx.head,
    base: ctx.base,
  });
  if (!diffs.files) {
    return;
  }
  return await Promise.all(diffs.files.map(async file => {
    core.info(`checking file ${file.filename}`);
    return await Promise.all(rules.map(async rule => {
      if (!rule.pattern.test(file.filename)) {
        core.debug(`- rule not match: ${rule.name}, ${rule.pattern}`);
        return;
      }
      core.debug(`- rule match: ${rule.name}, ${rule.pattern}`);
      return (await rule.check(ctx, octokit, file))?.map(error => ({
        filename: file.filename,
        rule,
        message: error,
      }));
    })).then(errors => errors.filter(error => !!error).flat());
  })).then(res => res.flat());
}
