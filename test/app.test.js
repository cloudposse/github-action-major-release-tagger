const os = require('os');
const assert = require('assert');
const { main, RESPONSE_REASON } = require('../src/app');
const { v4: uuidv4 } = require('uuid');
const gitUtils = require('../src/git_utils.js');

const TMP_DIR = os.tmpdir();

const log4js = require('log4js');

log4js.configure({
  appenders: { console: { type: 'console' } },
  categories: { default: { appenders: ['console'], level: 'debug' } },
});
const logger = log4js.getLogger();

test('repo has no tags', async () => {
  // prepare
  const repoPath = `${TMP_DIR}/${uuidv4()}`;
  logger.debug(`repoPath: ${repoPath}`);

  gitUtils.initializeGitRepo(repoPath);
  gitUtils.createAndCommitFile(repoPath, uuidv4(), uuidv4());
  gitUtils.createAndCommitFile(repoPath, uuidv4(), uuidv4());

  logger.debug(`State of repo:\n${gitUtils.getCurrentStateOfRepo(repoPath)}`);

  // test
  const response = await main(repoPath, false);

  // verify
  logger.debug(`State of repo:\n${gitUtils.getCurrentStateOfRepo(repoPath)}`);

  assert.strictEqual(response.succeeded, true);
  assert.strictEqual(response.reason, RESPONSE_REASON.NO_SEMVER_TAGS_FOUND);
});


test('repo has no semver tags', async () => {
  // prepare
  const repoPath = `${TMP_DIR}/${uuidv4()}`;
  logger.debug(`repoPath: ${repoPath}`);

  gitUtils.initializeGitRepo(repoPath);
  const sha1 = gitUtils.createAndCommitFile(repoPath, uuidv4(), uuidv4());
  gitUtils.createTag(repoPath, 'latest', sha1, false);
  const sha2 = gitUtils.createAndCommitFile(repoPath, uuidv4(), uuidv4());
  gitUtils.createTag(repoPath, 'minor_fix', sha2, false);

  logger.debug(`State of repo:\n${gitUtils.getCurrentStateOfRepo(repoPath)}`);

  // test
  const response = await main(repoPath, false);

  // verify
  logger.debug(`State of repo:\n${gitUtils.getCurrentStateOfRepo(repoPath)}`);

  assert.strictEqual(response.succeeded, true);
  assert.strictEqual(response.reason, RESPONSE_REASON.NO_SEMVER_TAGS_FOUND);
});


test('repo has valid tag with corresponding vtag', async () => {
  // prepare
  const repoPath = `${TMP_DIR}/${uuidv4()}`;
  logger.debug(`repoPath: ${repoPath}`);

  gitUtils.initializeGitRepo(repoPath);
  const sha1 = gitUtils.createAndCommitFile(repoPath, uuidv4(), uuidv4());
  gitUtils.createTag(repoPath, '1.0.0', sha1, false);
  gitUtils.createTag(repoPath, 'v1', sha1, false);

  logger.debug(`State of repo:\n${gitUtils.getCurrentStateOfRepo(repoPath)}`);

  // test
  response = await main(repoPath, false);

  // verify
  logger.debug(`State of repo:\n${gitUtils.getCurrentStateOfRepo(repoPath)}`);

  assert.strictEqual(response.succeeded, true);
  assert.strictEqual(response.reason, RESPONSE_REASON.NO_CHANGES);
});


test('created vtag for tag', async () => {
  // prepare
  const repoPath = `${TMP_DIR}/${uuidv4()}`;
  logger.debug(`repoPath: ${repoPath}`);

  gitUtils.initializeGitRepo(repoPath);
  const sha1 = gitUtils.createAndCommitFile(repoPath, uuidv4(), uuidv4());
  gitUtils.createTag(repoPath, '1.0.0', sha1, false);

  logger.debug(`State of repo:\n${gitUtils.getCurrentStateOfRepo(repoPath)}`);

  // test
  response = await main(repoPath, false);

  // verify
  logger.debug(`State of repo:\n${gitUtils.getCurrentStateOfRepo(repoPath)}`);

  assert.strictEqual(response.succeeded, true);
  assert.strictEqual(response.reason, RESPONSE_REASON.MAPPED_TAGS);
  assert.strictEqual(sha1, gitUtils.getSHAForTag(repoPath, 'v1'));
});


test('multiple vtags missing', async () => {
  // prepare
  const repoPath = `${TMP_DIR}/${uuidv4()}`;
  logger.debug(`repoPath: ${repoPath}`);

  gitUtils.initializeGitRepo(repoPath);
  gitUtils.createAndCommitFile(repoPath, uuidv4(), uuidv4());
  gitUtils.createAndCommitFile(repoPath, uuidv4(), uuidv4());
  const sha1 = gitUtils.createAndCommitFile(repoPath, uuidv4(), uuidv4());
  gitUtils.createTag(repoPath, '1.0.0', sha1, false);
  const sha2 = gitUtils.createAndCommitFile(repoPath, uuidv4(), uuidv4());
  gitUtils.createTag(repoPath, '2.0.0', sha2, false);
  const sha3 = gitUtils.createAndCommitFile(repoPath, uuidv4(), uuidv4());
  gitUtils.createTag(repoPath, '3.0.0', sha3, false);

  logger.debug(`State of repo:\n${gitUtils.getCurrentStateOfRepo(repoPath)}`);

  // test
  response = await main(repoPath, false);

  // verify
  logger.debug(`State of repo:\n${gitUtils.getCurrentStateOfRepo(repoPath)}`);

  assert.strictEqual(response.succeeded, true);
  assert.strictEqual(response.reason, RESPONSE_REASON.MAPPED_TAGS);
  assert.strictEqual(sha1, gitUtils.getSHAForTag(repoPath, 'v1'));
  assert.strictEqual(sha2, gitUtils.getSHAForTag(repoPath, 'v2'));
  assert.strictEqual(sha3, gitUtils.getSHAForTag(repoPath, 'v3'));
});


test('vtag doesnt point to latest', async () => {
  // prepare
  const repoPath = `${TMP_DIR}/${uuidv4()}`;
  logger.debug(`repoPath: ${repoPath}`);

  gitUtils.initializeGitRepo(repoPath);
  gitUtils.createAndCommitFile(repoPath, uuidv4(), uuidv4());
  const sha1 = gitUtils.createAndCommitFile(repoPath, uuidv4(), uuidv4());
  gitUtils.createTag(repoPath, '1.0.0', sha1, false);
  gitUtils.createTag(repoPath, 'v1', sha1, false);
  const sha2 = gitUtils.createAndCommitFile(repoPath, uuidv4(), uuidv4());
  gitUtils.createTag(repoPath, '1.1.0', sha2, false);

  logger.debug(`State of repo:\n${gitUtils.getCurrentStateOfRepo(repoPath)}`);

  // test
  response = await main(repoPath, false);

  // verify
  logger.debug(`State of repo:\n${gitUtils.getCurrentStateOfRepo(repoPath)}`);

  assert.strictEqual(response.succeeded, true);
  assert.strictEqual(response.reason, RESPONSE_REASON.MAPPED_TAGS);
  assert.strictEqual(sha2, gitUtils.getSHAForTag(repoPath, 'v1'));
});

test('vtag doesnt have corresponding semver tag', async () => {
  // prepare
  const repoPath = `${TMP_DIR}/${uuidv4()}`;
  logger.debug(`repoPath: ${repoPath}`);

  gitUtils.initializeGitRepo(repoPath);
  gitUtils.createAndCommitFile(repoPath, uuidv4(), uuidv4());
  const sha1 = gitUtils.createAndCommitFile(repoPath, uuidv4(), uuidv4());
  gitUtils.createTag(repoPath, 'v1', sha1, false);
  const sha2 = gitUtils.createAndCommitFile(repoPath, uuidv4(), uuidv4());
  gitUtils.createTag(repoPath, '2.0.0', sha2, false);
  gitUtils.createTag(repoPath, 'v2', sha2, false);

  logger.debug(`State of repo:\n${gitUtils.getCurrentStateOfRepo(repoPath)}`);

  // test
  response = await main(repoPath, false);

  // verify
  logger.debug(`State of repo:\n${gitUtils.getCurrentStateOfRepo(repoPath)}`);

  assert.strictEqual(response.succeeded, true);
  assert.strictEqual(response.reason, RESPONSE_REASON.NO_CHANGES);
});

test('semver tag in branch and in master', async () => {
  // prepare
  const repoPath = `${TMP_DIR}/${uuidv4()}`;
  logger.debug(`repoPath: ${repoPath}`);

  gitUtils.initializeGitRepo(repoPath);
  gitUtils.createAndCommitFile(repoPath, uuidv4(), uuidv4());
  const sha1 = gitUtils.createAndCommitFile(repoPath, uuidv4(), uuidv4());
  gitUtils.createTag(repoPath, '1.0.0', sha1, false);
  const sha2 = gitUtils.createAndCommitFile(repoPath, uuidv4(), uuidv4());
  gitUtils.createTag(repoPath, '1.1.0', sha2, false);
  gitUtils.createTag(repoPath, 'v1', sha2, false);
  gitUtils.createBranch(repoPath, 'release/v0', sha2, false);
  gitUtils.checkoutBranch(repoPath, 'main');
  const sha3 = gitUtils.createAndCommitFile(repoPath, uuidv4(), uuidv4());
  gitUtils.createTag(repoPath, '2.0.0', sha3, false);
  gitUtils.createTag(repoPath, 'v2', sha3, false);
  gitUtils.checkoutBranch(repoPath, 'release/v0');
  const sha4 = gitUtils.createAndCommitFile(repoPath, uuidv4(), uuidv4());
  gitUtils.createTag(repoPath, '1.2.1', sha4, false);
  gitUtils.checkoutBranch(repoPath, 'main');
  const sha5 = gitUtils.createAndCommitFile(repoPath, uuidv4(), uuidv4());
  gitUtils.createTag(repoPath, '2.1.0', sha5, false);

  logger.debug(`State of repo:\n${gitUtils.getCurrentStateOfRepo(repoPath)}`);
  let shas = gitUtils.getTagToSHAMapping(repoPath, gitUtils.getAllTags(repoPath));
  logger.debug(`SHAs:\n${Array.from(shas.entries()).map(([key, value]) => `${key}: ${value}`).join('\n')}`);

  // test
  response = await main(repoPath, false);

  // verify
  logger.debug(`State of repo:\n${gitUtils.getCurrentStateOfRepo(repoPath)}`);
  logger.debug(`State of repo:\n${gitUtils.getCurrentStateOfRepo(repoPath, 'release/v0')}`);
  shas = gitUtils.getTagToSHAMapping(repoPath, gitUtils.getAllTags(repoPath));
  logger.debug(`SHAs:\n${Array.from(shas.entries()).map(([key, value]) => `${key}: ${value}`).join('\n')}`);

  assert.strictEqual(response.succeeded, true);
  assert.strictEqual(response.reason, RESPONSE_REASON.MAPPED_TAGS);
  assert.strictEqual(sha4, gitUtils.getSHAForTag(repoPath, 'v1'));
  assert.strictEqual(sha5, gitUtils.getSHAForTag(repoPath, 'v2'));
});