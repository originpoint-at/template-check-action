import type { OctokitClient, Repo } from './types';

interface ContextValues {
  repo: Repo;
  base: string;
  head: string;
  repoPath: string;
  onChainStorageLimit?: number;
}

export class Context implements ContextValues {
  repo: Repo;
  base: string;
  head: string;
  repoPath: string;
  onChainStorageLimit?: number;
  private fileCache = new Map<string, string>();
  constructor(values: ContextValues) {
    this.repo = values.repo;
    this.base = values.base;
    this.head = values.head;
    this.repoPath = values.repoPath;
    this.onChainStorageLimit = values.onChainStorageLimit;
  }
  async getFileContent(octokit: OctokitClient, ref: string, path: string) {
    const cacheKey = `${ref}:${path}`;
    if (this.fileCache.has(cacheKey)) {
      return this.fileCache.get(cacheKey)!;
    }
    const { data: content } = await octokit.rest.repos.getContent({
      ...this.repo,
      path,
      ref,
    });
    if (Array.isArray(content)) {
      throw new Error(`expected a file, but got a directory: ${path}`);
    }
    if (content.type !== 'file') {
      throw new Error(`expected a file, but got a ${content.type}: ${path}`);
    }
    const str = Buffer.from(content.content, 'base64').toString();
    this.fileCache.set(cacheKey, str);
    return str;
  }
}
