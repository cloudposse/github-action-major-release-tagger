const os = require('os');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { main, RESPONSE_REASON } = require('../src/app');
const { v4: uuidv4 } = require('uuid');
const GitWrapper = require('../src/git_wrapper.js');
const { logger } = require('../src/utils.js');

const TMP_DIR = os.tmpdir();

function createRepoDir() {
  const repoPath = `${TMP_DIR}/${uuidv4()}`;
  logger.debug(`repoPath: ${repoPath}`);
  fs.mkdirSync(repoPath);
  return repoPath;
}

async function createFileAndCommit(gitWrapper, repoPath) {
  fs.writeFileSync(path.join(repoPath, uuidv4()), uuidv4());
  return await gitWrapper.commit();
}

test('repo has no tags', async () => {
  // prepare
  const repoPath = createRepoDir();
  const gitWrapper = new GitWrapper(repoPath);

  await gitWrapper.initializeGitRepo();
  await createFileAndCommit(gitWrapper, repoPath);
  await createFileAndCommit(gitWrapper, repoPath);

  logger.debug(`State of repo:\n${await gitWrapper.getCurrentStateOfRepo()}`);

  // test
  const response = await main(repoPath, false);

  // verify
  logger.debug(`State of repo:\n${await gitWrapper.getCurrentStateOfRepo()}`);

  assert.strictEqual(response.succeeded, true);
  assert.strictEqual(response.reason, RESPONSE_REASON.NO_SEMVER_TAGS_FOUND);
});


test('repo has no semver tags', async () => {
  // prepare
  const repoPath = createRepoDir();
  const gitWrapper = new GitWrapper(repoPath);

  await gitWrapper.initializeGitRepo();
  const sha1 = await createFileAndCommit(gitWrapper, repoPath);
  await gitWrapper.createTag('latest', sha1, false);
  const sha2 = await createFileAndCommit(gitWrapper, repoPath);
  await gitWrapper.createTag('minor_fix', sha2, false);

  logger.debug(`State of repo:\n${await gitWrapper.getCurrentStateOfRepo()}`);

  // test
  const response = await main(repoPath, false);

  // verify
  logger.debug(`State of repo:\n${await gitWrapper.getCurrentStateOfRepo()}`);

  assert.strictEqual(response.succeeded, true);
  assert.strictEqual(response.reason, RESPONSE_REASON.NO_SEMVER_TAGS_FOUND);
});


test('repo has valid tag with corresponding vtag', async () => {
  // prepare
  const repoPath = createRepoDir();
  const gitWrapper = new GitWrapper(repoPath);

  await gitWrapper.initializeGitRepo();
  const sha1 = await createFileAndCommit(gitWrapper, repoPath);
  await gitWrapper.createTag('1.0.0', sha1, false);
  await gitWrapper.createTag('v1', sha1, false);

  logger.debug(`State of repo:\n${await gitWrapper.getCurrentStateOfRepo()}`);

  // test
  response = await main(repoPath, false);

  // verify
  logger.debug(`State of repo:\n${await gitWrapper.getCurrentStateOfRepo()}`);

  assert.strictEqual(response.succeeded, true);
  assert.strictEqual(response.reason, RESPONSE_REASON.NO_CHANGES);
});


test('created vtag for tag', async () => {
  // prepare
  const repoPath = createRepoDir();
  const gitWrapper = new GitWrapper(repoPath);

  await gitWrapper.initializeGitRepo();
  const sha1 = await createFileAndCommit(gitWrapper, repoPath);
  await gitWrapper.createTag('1.0.0', sha1, false);

  logger.debug(`State of repo:\n${await gitWrapper.getCurrentStateOfRepo()}`);

  // test
  response = await main(repoPath, false);

  // verify
  logger.debug(`State of repo:\n${await gitWrapper.getCurrentStateOfRepo()}`);

  assert.strictEqual(response.succeeded, true);
  assert.strictEqual(response.reason, RESPONSE_REASON.MAPPED_TAGS);
  assert.strictEqual(sha1, await gitWrapper.getSHAForTag('v1'));
});


test('multiple vtags missing', async () => {
  // prepare
  const repoPath = createRepoDir();
  const gitWrapper = new GitWrapper(repoPath);

  await gitWrapper.initializeGitRepo();
  await createFileAndCommit(gitWrapper, repoPath);
  await createFileAndCommit(gitWrapper, repoPath);
  const sha1 = await createFileAndCommit(gitWrapper, repoPath);
  await gitWrapper.createTag('1.0.0', sha1, false);
  const sha2 = await createFileAndCommit(gitWrapper, repoPath);
  await gitWrapper.createTag('2.0.0', sha2, false);
  const sha3 = await createFileAndCommit(gitWrapper, repoPath);
  await gitWrapper.createTag('3.0.0', sha3, false);

  logger.debug(`State of repo:\n${await gitWrapper.getCurrentStateOfRepo()}`);

  // test
  response = await main(repoPath, false);

  // verify
  logger.debug(`State of repo:\n${await gitWrapper.getCurrentStateOfRepo()}`);

  assert.strictEqual(response.succeeded, true);
  assert.strictEqual(response.reason, RESPONSE_REASON.MAPPED_TAGS);
  assert.strictEqual(sha1, await gitWrapper.getSHAForTag('v1'));
  assert.strictEqual(sha2, await gitWrapper.getSHAForTag('v2'));
  assert.strictEqual(sha3, await gitWrapper.getSHAForTag('v3'));
});


test('vtag doesnt point to latest', async () => {
  // prepare
  const repoPath = createRepoDir();
  const gitWrapper = new GitWrapper(repoPath);

  await gitWrapper.initializeGitRepo();
  await createFileAndCommit(gitWrapper, repoPath);
  const sha1 = await createFileAndCommit(gitWrapper, repoPath);
  await gitWrapper.createTag('1.0.0', sha1, false);
  await gitWrapper.createTag('v1', sha1, false);
  const sha2 = await createFileAndCommit(gitWrapper, repoPath);
  await gitWrapper.createTag('1.1.0', sha2, false);

  logger.debug(`State of repo:\n${await gitWrapper.getCurrentStateOfRepo()}`);

  // test
  response = await main(repoPath, false);

  // verify
  logger.debug(`State of repo:\n${await gitWrapper.getCurrentStateOfRepo()}`);

  assert.strictEqual(response.succeeded, true);
  assert.strictEqual(response.reason, RESPONSE_REASON.MAPPED_TAGS);
  assert.strictEqual(sha2, await gitWrapper.getSHAForTag('v1'));
});

test('vtag doesnt have corresponding semver tag', async () => {
  // prepare
  const repoPath = createRepoDir();
  const gitWrapper = new GitWrapper(repoPath);

  await gitWrapper.initializeGitRepo();
  await createFileAndCommit(gitWrapper, repoPath);
  const sha1 = await createFileAndCommit(gitWrapper, repoPath);
  await gitWrapper.createTag('v1', sha1, false);
  const sha2 = await createFileAndCommit(gitWrapper, repoPath);
  await gitWrapper.createTag('2.0.0', sha2, false);
  await gitWrapper.createTag('v2', sha2, false);

  logger.debug(`State of repo:\n${await gitWrapper.getCurrentStateOfRepo()}`);

  // test
  response = await main(repoPath, false);

  // verify
  logger.debug(`State of repo:\n${await gitWrapper.getCurrentStateOfRepo()}`);

  assert.strictEqual(response.succeeded, true);
  assert.strictEqual(response.reason, RESPONSE_REASON.NO_CHANGES);
});

test('semver tag in branch and in master', async () => {
  // prepare
  const repoPath = createRepoDir();
  const gitWrapper = new GitWrapper(repoPath);

  await gitWrapper.initializeGitRepo();
  await createFileAndCommit(gitWrapper, repoPath);
  const sha1 = await createFileAndCommit(gitWrapper, repoPath);
  await gitWrapper.createTag('1.0.0', sha1, false);
  const sha2 = await createFileAndCommit(gitWrapper, repoPath);
  await gitWrapper.createTag('1.1.0', sha2, false);
  await gitWrapper.createTag('v1', sha2, false);
  await gitWrapper.createBranch('release/v0', sha2, false);
  await gitWrapper.checkoutBranch('master');
  const sha3 = await createFileAndCommit(gitWrapper, repoPath);
  await gitWrapper.createTag('2.0.0', sha3, false);
  await gitWrapper.createTag('v2', sha3, false);
  await gitWrapper.checkoutBranch('release/v0');
  const sha4 = await createFileAndCommit(gitWrapper, repoPath);
  await gitWrapper.createTag('1.2.1', sha4, false);
  await gitWrapper.checkoutBranch('master');
  const sha5 = await createFileAndCommit(gitWrapper, repoPath);
  await gitWrapper.createTag('2.1.0', sha5, false);

  logger.debug(`State of repo:\n${await gitWrapper.getCurrentStateOfRepo()}`);
  logger.debug(`SHAs:\n${Array.from(shas.entries()).map(([key, value]) => `${key}: ${value}`).join('\n')}`);

  // test
  response = await main(repoPath, false);
});