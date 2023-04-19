const simpleGit = require('simple-git');

class GitWrapper {
  constructor(repoPath) {
    this.git = simpleGit(repoPath);
  }

  async getAllTags() {
    return new Promise((resolve, reject) => {
      this.git.raw(['tag', '--sort=-v:refname'], (error, tags) => {
        if (error) {
          reject(error);
        } else {
          resolve(tags.trim().split('\n'));
        }
      });
    });
  }

  async getSHAForTag(tag) {
    const sha = await this.git.revparse([tag]);
    return sha.trim();
  }

  async getTagToSHAMapping(tags) {
    const result = new Map();

    for (const tag of tags) {
      const sha = await this.getSHAForTag(tag);
      result.set(tag, sha);
    }

    return result;
  }

  async initializeGitRepo() {
    await this.git.init();
    await this.git.raw(['config', 'user.name', 'Test User']);
    await this.git.raw(['config', 'user.email', 'test@example.com']);
  }

  async commit() {
    await this.git.add('.');

    const commitResult = await this.git.commit('update');

    return commitResult.commit;
  }

  async pushToRemote(branchOrTag, flag = '') {
    await this.git.push([flag, 'origin', branchOrTag]);
  }

  async createTag(tag, sha, doPush = true) {
    await this.git.tag([tag, sha]);

    if (doPush) {
      await this.pushToRemote(tag);
    }
  }

  async reTag(tag, sha, doPush = true) {
    await this.git.tag(['--force', tag, sha]);

    if (doPush) {
      await this.pushToRemote(tag, '--force');
    }
  }

  async deleteTag(tag, doPush = true) {
    await this.git.tag({ d: true }, tag, sha);

    if (doPush) {
      await this.pushToRemote(tag, '--delete');
    }
  }

  async log(maxLines = 20) {
    const logs = await this.git.log({
      'format': { hash: '%h', author: '%an', message: '%s%d', date: '%as' },
      '--max-count': maxLines,
    });

    return logs.all.map((log) => `${log.date} ${log.hash} ${log.author} ${log.message}`);
  }

  async createBranch(branchName, commit) {
    return await this.git.checkoutBranch(branchName, commit);
  }

  async checkoutBranch(branchName) {
    return await this.git.checkout(branchName);
  }

  async getCurrentStateOfRepo(maxLines = 20) {
    const logs = await this.log(maxLines);
    return logs.join('\n');
  }
}

module.exports = GitWrapper;