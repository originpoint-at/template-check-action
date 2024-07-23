import { Operation } from 'json-diff-ts';
import * as yaml from 'yaml';
import { Context } from './context';
import { checkJson } from './json-diff';
import { Diff, OctokitClient } from './types';

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
        const errors = checkJson(jsonChangeRules, base, head);
        if (errors.length) {
          return errors.map(err => err.message);
        }
      } catch (err) {
        return [err instanceof Error ? err.message : String(err)];
      }
      return undefined;
    },
  },
  {
    name: 'image-exists',
    pattern: /^layouts.yaml$/,
    check: async (ctx, octokit, diff) => {
      // TODO: check images in layouts.yaml exists
      return undefined;
    },
  },
];

export type JsonChangeRule = {
  key: string | RegExp;
  allowedOperations: Operation[];
  subRules?: JsonChangeRule[];
};

export const jsonChangeRules: JsonChangeRule[] = [
  { key: 'template', allowedOperations: [] },
  { key: 'engine', allowedOperations: [Operation.UPDATE] },
  {
    key: 'config',
    allowedOperations: [Operation.UPDATE],
    subRules: [
      { key: 'size', allowedOperations: [] },
      { key: 'mime', allowedOperations: [] },
      { key: 'option', allowedOperations: [] },
      { key: /^\w+$/, allowedOperations: [Operation.ADD] },
    ],
  },
  {
    key: 'items',
    allowedOperations: [Operation.UPDATE],
    subRules: [
      { key: /^\d+$/, allowedOperations: [Operation.ADD] },
    ],
  },
  {
    key: 'suites',
    allowedOperations: [Operation.UPDATE],
    subRules: [
      {
        key: /^\d+$/,
        allowedOperations: [Operation.ADD, Operation.UPDATE],
        subRules: [
          { key: 'name', allowedOperations: [] },
          {
            key: 'backgrounds',
            allowedOperations: [Operation.UPDATE],
            subRules: [
              {
                key: /^\d+$/,
                allowedOperations: [Operation.ADD],
              },
            ],
          },
          {
            key: 'layers',
            allowedOperations: [Operation.UPDATE],
            subRules: [
              {
                key: /^\d+$/,
                allowedOperations: [Operation.ADD, Operation.UPDATE],
                subRules: [
                  { key: 'name', allowedOperations: [] },
                  {
                    key: 'items',
                    allowedOperations: [Operation.UPDATE],
                    subRules: [
                      {
                        key: /^\d+$/,
                        allowedOperations: [Operation.ADD],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];
