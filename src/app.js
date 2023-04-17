const semver = require('semver');
const log4js = require('log4js');
const gitUtils = require('../src/git_utils.js');

const logLevel = process.env.LOG_LEVEL || 'info';

log4js.configure({
  appenders: { console: { type: 'console' } },
  categories: { default: { appenders: ['console'], level: logLevel } },
});

const logger = log4js.getLogger();

const RESPONSE_REASON = {
  NO_SEMVER_TAGS_FOUND: 'NO_SEMVER_TAGS_FOUND',
  FAILED_TO_REMAP_TAG: 'FAILED_TO_REMAP_TAG',
  MAPPED_TAGS: 'MAPPED_TAGS',
  NO_CHANGES: 'NO_CHANGES',
};

class Response {
  constructor(succeeded, reason, message, data) {
    this.succeeded = succeeded;
    this.reason = reason;
    this.message = message;
    this.data = data;
  }
}

class VTagData {
  constructor(state, oldSHA, newSHA) {
    this.state = state;
    this.oldSHA = oldSHA;
    this.newSHA = newSHA;
  }
}

function isSemver(version) {
  return semver.valid(version) != null;
}

function getLatestSemVerTags(tags) {
  const latestTags = new Map();

  for (const tag of tags) {
    if (isSemver(tag)) {
      const major = semver.major(tag);
      const key = `${major}`;

      if (!latestTags.has(key)) {
        latestTags.set(key, tag);
      }
    }
  }

  return latestTags;
}

function getVTags(tags) {
  return new Set(tags.filter((tag) => /^v\d+$/.test(tag)));
}

async function main(repoPath, doPush = true) {
  const allTags = gitUtils.getAllTags(repoPath);
  logger.debug(`All available tags:\n${allTags.join('\n')}`);

  const latestSemVerTags = getLatestSemVerTags(allTags);
  logger.info(`Latest SemVer tags:\n${Array.from(latestSemVerTags.values()).join('\n')}`);

  const vTags = getVTags(allTags);
  logger.info(`V tags:\n${Array.from(vTags).join('\n')}`);

  const shas = gitUtils.getTagToSHAMapping(repoPath, Array.from(latestSemVerTags.values()).concat(Array.from(vTags)));
  logger.info(`SHAs:\n${Array.from(shas.entries()).map(([key, value]) => `${key}: ${value}`).join('\n')}`);

  if (latestSemVerTags.size === 0) {
    return new Response(true, RESPONSE_REASON.NO_SEMVER_TAGS_FOUND, 'No SemVer tags found', {});
  } else {
    logger.info(`Found ${latestSemVerTags.size} SemVer tags.`);
  }

  const vTagData = new Map();

  try {
    for (const [major, tag] of latestSemVerTags) {
      const majorTagSHA = shas.get(tag);

      if (vTags.has(`v${major}`)) {
        const vTagSHA = shas.get(`v${major}`);

        if (majorTagSHA === vTagSHA) {
          logger.info(`${tag} and v${major} points to the same SHA: ${majorTagSHA}. Skipping...`);
        } else {
          logger.info(`Latest tag '${tag} (${majorTagSHA})' and 'v${major} (${vTagSHA})' points different commits. Updating 'v${major}'.`);
          gitUtils.deleteTag(repoPath, `v${major}`, doPush);
          gitUtils.createTag(repoPath, `v${major}`, majorTagSHA, doPush);
          vTagData.set(`v${major}`, new VTagData('updated', vTagSHA, majorTagSHA));
        }
      } else {
        logger.info(`V tag doesn't exist for '${tag}'. Creating a new 'v${major}' tag pointing to ${majorTagSHA}`);
        gitUtils.createTag(repoPath, `v${major}`, majorTagSHA, doPush);
        vTagData.set(`v${major}`, new VTagData('created', '', majorTagSHA));
      }
    }
  } catch (e) {
    return new Response(false, RESPONSE_REASON.FAILED_TO_REMAP_TAG, e.message, vTagData);
  }

  if (vTagData.size === 0) {
    return new Response(true, RESPONSE_REASON.NO_CHANGES, 'No changes were made', vTagData);
  } else {
    return new Response(true, RESPONSE_REASON.MAPPED_TAGS, 'Successfully created/update v-tags', vTagData);
  }
}

module.exports = { main, Response, RESPONSE_REASON };