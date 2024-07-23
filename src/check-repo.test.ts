import mock from 'mock-fs';
import { afterEach, describe, expect, test } from 'vitest';
import * as yaml from 'yaml';
import { checkRepo } from './check-repo';
import { Context } from './context';

describe.sequential('checkRepo', () => {
  const ctx = new Context({
    repo: { owner: 'mock-owner', repo: 'mock-repo' },
    base: 'base',
    head: 'head',
    repoPath: 'mock-repo-path',
    onChainStorageLimit: 1024 * 20,
  });

  describe('default', () => {
    afterEach(() => {
      mock.restore();
    });

    const layouts = {
      template: 'default',
      items: [
        { image: 'item_01.png' },
        { image: 'item_02.png' },
        { image: 'item_03.png' },
      ],
    };

    test('should pass without errors and maxFileSize within outputs', () => {
      mock({
        [ctx.repoPath]: {
          'layouts.yaml': yaml.stringify(layouts),
          'image': {
            'item_01.png': Buffer.alloc(100),
            'item_02.png': Buffer.alloc(200),
            'item_03.png': Buffer.alloc(300),
          },
        },
      });
      const result = checkRepo(ctx);
      expect(result).resolves.toMatchObject({
        errors: [],
        outputs: { maxFileSize: 300 },
      });
    });

    test('should have error if image not found', () => {
      mock({
        [ctx.repoPath]: {
          'layouts.yaml': yaml.stringify(layouts),
          'image': {
            'item_01.png': Buffer.alloc(100),
            'item_02.png': Buffer.alloc(200),
          },
        },
      });
      const result = checkRepo(ctx);
      expect(result).resolves.toMatchObject({
        errors: [{ filename: 'item_03.png' }],
        outputs: { maxFileSize: 200 },
      });
    });

    test('should have error if image size is greater than on chain storage limit', () => {
      mock({
        [ctx.repoPath]: {
          'layouts.yaml': yaml.stringify(layouts),
          'image': {
            'item_01.png': Buffer.alloc(100),
            'item_02.png': Buffer.alloc(200),
            'item_03.png': Buffer.alloc(1024 * 20 + 1),
          },
        },
      });
      const result = checkRepo(ctx);
      expect(result).resolves.toMatchObject({
        outputs: { maxFileSize: 20481 },
        errors: [{
          filename: 'item_03.png',
        }],
      });
    });
  });

  describe('composite', () => {
    afterEach(() => {
      mock.restore();
    });

    const layouts = {
      template: 'png_composite',
      suites: [
        {
          name: 'suite-1',
          layers: [
            {
              name: 'layer-1',
              items: [
                { image: 'item_01.png' },
                { image: 'item_02.png' },
              ],
            },
            {
              name: 'layer-2',
              items: [
                { image: 'item_01.png' },
                { image: 'item_02.png' },
              ],
            },
          ],
        },
      ],
    };

    test('should pass', () => {
      mock({
        [ctx.repoPath]: {
          'layouts.yaml': yaml.stringify(layouts),
          'image': {
            'suite-1': {
              'layer-1': {
                'item_01.png': Buffer.alloc(100),
                'item_02.png': Buffer.alloc(200),
              },
              'layer-2': {
                'item_01.png': Buffer.alloc(100),
                'item_02.png': Buffer.alloc(200),
              },
            },
          },
        },
      });
      const result = checkRepo(ctx);
      expect(result).resolves.toMatchObject({
        errors: [],
        outputs: { maxFileSize: 400 },
      });
    });

    test('should have error if image not found', () => {
      mock({
        [ctx.repoPath]: {
          'layouts.yaml': yaml.stringify(layouts),
          'image': {
            'suite-1': {
              'layer-1': {
                'item_01.png': Buffer.alloc(100),
                'item_02.png': Buffer.alloc(200),
              },
              'layer-2': {
                'item_01.png': Buffer.alloc(100),
              },
            },
          },
        },
      });
      const result = checkRepo(ctx);
      expect(result).resolves.toMatchObject({
        errors: [{ filename: 'suite-1/layer-2/item_02.png' }],
      });
    });

    test('should have error if image size is greater than 16KB', () => {
      mock({
        [ctx.repoPath]: {
          'layouts.yaml': yaml.stringify(layouts),
          'image': {
            'suite-1': {
              'layer-1': {
                'item_01.png': Buffer.alloc(1024 * 16 + 1),
                'item_02.png': Buffer.alloc(1024 * 16 + 1),
              },
              'layer-2': {
                'item_01.png': Buffer.alloc(100),
                'item_02.png': Buffer.alloc(200),
              },
            },
          },
        },
      });
      const result = checkRepo(ctx);
      expect(result).resolves.toMatchObject({
        errors: [
          { filename: 'suite-1/layer-1/item_01.png', message: 'png file size should be less then or equal to 16KB' },
          { filename: 'suite-1/layer-1/item_02.png', message: 'png file size should be less then or equal to 16KB' },
        ],
      });
    });
  });
});
