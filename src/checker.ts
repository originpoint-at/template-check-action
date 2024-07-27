import * as core from '@actions/core';
import { Context } from './context';
import { DiffRule } from './rule';
import { OctokitClient } from './types';

type Error = {
  filename: string;
  rule: DiffRule;
  message: string;
};

export async function check(ctx: Context, octokit: OctokitClient, rules: DiffRule[]) {
  const errors: Error[] = [];
  for await (const err of _check(ctx, octokit, rules)) {
    errors.push(err);
  }
  return errors;
}

async function* _check(
  ctx: Context,
  octokit: OctokitClient,
  rules: DiffRule[],
): AsyncGenerator<Error> {
  const { data: diffs } = await octokit.rest.repos.compareCommits({
    ...ctx.repo,
    head: ctx.head,
    base: ctx.base,
  });
  if (!diffs.files) {
    return;
  }
  for await (const file of diffs.files) {
    core.info(`checking file ${file.filename}`);
    for await (const rule of rules) {
      if (!rule.pattern.test(file.filename)) {
        core.debug(`- rule not match: ${rule.name}, ${rule.pattern}`);
        continue;
      }
      core.debug(`- rule match: ${rule.name}, ${rule.pattern}`);
      const errors = await rule.check(ctx, octokit, file);
      if (errors) {
        for (const error of errors) {
          yield {
            filename: file.filename,
            rule,
            message: error,
          };
        }
      }
    }
  }
}
