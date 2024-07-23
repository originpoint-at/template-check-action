import { OctokitClient, Repo } from './types';

export class Context {
  repo: Repo;
  base: string;
  head: string;
  private fileCache = new Map<string, string>();
  constructor(repo: Repo, base: string, head: string) {
    this.repo = repo;
    this.base = base;
    this.head = head;
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
