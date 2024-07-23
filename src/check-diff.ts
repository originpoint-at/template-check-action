import * as core from '@actions/core';
import * as yaml from 'yaml';
import { checkJson } from './check-json-diff';
import { Context } from './context';
import { Diff, FileError, OctokitClient } from './types';

export async function checkDiff(ctx: Context, octokit: OctokitClient) {
  const errors: FileError[] = [];
  for await (const err of _check(ctx, octokit, diffRules)) {
    errors.push(err);
  }
  return { outputs: {}, errors };
}

async function* _check(
  ctx: Context,
  octokit: OctokitClient,
  rules: DiffRule[],
): AsyncGenerator<FileError> {
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
            message: error,
          };
        }
      }
    }
  }
}

export type DiffRule = {
  name: string;
  pattern: RegExp;
  check: (ctx: Context, octokit: OctokitClient, diff: Diff) => Promise<undefined | string[]>;
};

export const diffRules: DiffRule[] = [
  {
    name: 'only-allow-new-images',
    pattern: /^image\/.+\.(png|jpg|jpeg|gif|webp|svg)$/,
    check: async (ctx, octokit, diff) => {
      if (diff.status !== 'added') {
        return ['only new image files are allowed'];
      }
    },
  },
  {
    name: 'should-update-layouts-incrementally',
    pattern: /^layouts.yaml$/,
    check: async (ctx, octokit, diff) => {
      try {
        const baseContent = await ctx.getFileContent(octokit, ctx.base, 'layouts.yaml');
        const headContent = await ctx.getFileContent(octokit, ctx.head, 'layouts.yaml');
        const base = yaml.parse(baseContent);
        const head = yaml.parse(headContent);
        const errors = checkJson(base, head);
        if (errors.length) {
          return errors.map(err => err.message);
        }
      } catch (err) {
        return [err instanceof Error ? err.message : String(err)];
      }
      return undefined;
    },
  },
];
