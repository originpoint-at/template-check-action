import * as core from '@actions/core';
import * as fs from 'fs';
import * as path from 'path';
import { match } from 'ts-pattern';
import * as yaml from 'yaml';
import { Context } from './context';
import { FileError, Result } from './types';

export async function checkRepo(ctx: Context): Promise<Result> {
  core.info(`checking repo: ${ctx.repoPath}`);
  const buffer = fs.readFileSync(path.join(ctx.repoPath, 'layouts.yaml'));
  const layoutsYaml = yaml.parse(buffer.toString());

  return match(layoutsYaml)
    .with({ template: 'default' }, () => checkDefaultTemplateImages(ctx, layoutsYaml))
    .with({ template: 'png_composite' }, () => checkCompositeTemplateImages(ctx, layoutsYaml))
    .with({ template: 'svg_composite' }, () => checkCompositeTemplateImages(ctx, layoutsYaml))
    .otherwise(() => Promise.resolve({ errors: [], outputs: {} }));
}

async function checkDefaultTemplateImages(ctx: Context, layoutsYaml: any): Promise<Result> {
  core.info(`checking default template images`);
  const errors: FileError[] = [];
  let lagestFile: { file: string; stats: fs.Stats } | undefined;
  for (const item of layoutsYaml.items) {
    core.info(`checking item ${item.image}`);
    const imageUri = path.join(ctx.repoPath, 'image', item.image);
    try {
      const stats = await fs.promises.stat(imageUri);
      if (!lagestFile || stats.size > lagestFile.stats.size) {
        lagestFile = { file: item.image, stats };
      }
    } catch (err) {
      const message = `error occured when checking ${item.image}: ${err}`;
      core.error(message);
      errors.push({
        filename: item.image,
        message,
      });
    }
  }
  if (ctx.onChainStorageLimit && lagestFile) {
    if (lagestFile.stats.size > ctx.onChainStorageLimit) {
      const message = `${lagestFile.file} exceeds on chain storage limit(${ctx.onChainStorageLimit} bytes)`;
      core.error(message);
      errors.push({
        filename: lagestFile.file,
        message,
      });
    }
  }
  return {
    errors,
    outputs: { maxFileSize: lagestFile?.stats.size },
  };
}

async function checkCompositeTemplateImages(ctx: Context, layoutsYaml: any): Promise<Result> {
  core.info(`checking composite template images`);
  const errors: FileError[] = [];
  let maxFileSize = 0;
  for (const suite of layoutsYaml.suites) {
    let maxInSuite = 0;
    for (const layer of suite.layers) {
      let maxInLayer = 0;
      for (const item of layer.items) {
        core.info(`checking item: ${suite.name}, ${layer.name}, ${item.image}`);
        const imageUri = path.join(ctx.repoPath, 'image', suite.name, layer.name, item.image);
        try {
          const stats = await fs.promises.stat(imageUri);
          maxInLayer = Math.max(maxInLayer, stats.size);
          if (stats.size > 1024 * 16) {
            core.warning(`composition file item size should be less then or equal to 16KB: ${imageUri}`);
            errors.push({
              filename: path.join(suite.name, layer.name, item.image),
              message: 'png file size should be less then or equal to 16KB',
            });
          }
        } catch (err) {
          const message = `error occured when checking ${imageUri}: ${err}`;
          core.error(message);
          errors.push({
            filename: path.join(suite.name, layer.name, item.image),
            message,
          });
        }
      }
      maxInSuite += maxInLayer;
    }
    maxFileSize = Math.max(maxFileSize, maxInSuite);
  }
  return {
    errors,
    outputs: { maxFileSize },
  };
}
