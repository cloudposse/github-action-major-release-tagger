const fs = require('fs');
const { execSync } = require('child_process');

function getAllTags(repoPath) {
  const output = execSync('git tag --sort=-v:refname', { cwd: repoPath }).toString();
  return output.split('\n').filter(Boolean);
}

function initializeGitRepo(dir) {
  fs.mkdirSync(dir);

  execSync('git init --initial-branch=main', { cwd: dir });
  execSync('git config user.email "test@example.com"', { cwd: dir });
  execSync('git config user.name "Test User"', { cwd: dir });
}

function createAndCommitFile(repoPath, fileName, content) {
  const path = repoPath + '/' + fileName;
  fs.writeFileSync(path, content);

  execSync('git add .', { cwd: repoPath });
  execSync('git commit -m "update"', { cwd: repoPath });

  return getLastCommitSHA(repoPath);
}

function getLastCommitSHA(repoPath) {
  return execSync('git rev-parse HEAD', { cwd: repoPath }).toString().trim();
}

function createTag(repoPath, tag, sha, doPush = true) {
  execSync(`git tag -a ${tag} ${sha} -m ""`, { cwd: repoPath });

  if (doPush) {
    execSync(`git push origin ${tag}`, { cwd: repoPath });
  }
}

function reTag(repoPath, tag, sha, doPush = true) {
  execSync(`git tag -fa ${tag} ${sha} -m ""`, { cwd: repoPath });

  if (doPush) {
    execSync(`git push origin ${tag} --force`, { cwd: repoPath });
  }
}

function deleteTag(repoPath, tag, doPush = true) {
  execSync(`git tag -d ${tag}`, { cwd: repoPath });
  if (doPush) {
    execSync(`git push --delete origin ${tag}`, { cwd: repoPath });
  }
}

function getSHAForTag(repoPath, tag) {
  return execSync(`git rev-list -n 1 ${tag}`, { cwd: repoPath }).toString().trim();
}

function getTagToSHAMapping(repoPath, tags) {
  const result = new Map();

  for (const tag of tags) {
    const sha = getSHAForTag(repoPath, tag);
    result.set(tag, sha);
  }

  return result;
}

function gitLog(repoPath, branchName = 'main', maxLines = 20) {
  const output = execSync(`git log ${branchName} --date=short --pretty=format:"%C(124)%ad %C(24)%h %C(34)%an %C(252)%s%C(178)%d" | head -n ${maxLines}`, { cwd: repoPath }).toString();
  return output.split('\n').filter(Boolean);
}

function createBranch(repoPath, branchName, commit) {
  execSync(`git checkout -b ${branchName} ${commit}`, { cwd: repoPath });
}

function checkoutBranch(repoPath, branchName) {
  execSync(`git checkout ${branchName}`, { cwd: repoPath });
}

function getCurrentStateOfRepo(repoPath, branchName = 'main', maxLines = 20) {
  return gitLog(repoPath, branchName, maxLines).join('\n');
}

module.exports = {
  getAllTags,
  initializeGitRepo,
  createAndCommitFile,
  getLastCommitSHA,
  createTag,
  reTag,
  getTagToSHAMapping,
  deleteTag,
  gitLog,
  getCurrentStateOfRepo,
  getSHAForTag,
  createBranch,
  checkoutBranch,
};