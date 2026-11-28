import { execFileSync } from 'node:child_process';

const repository = process.env.GITHUB_REPOSITORY;
const branch = process.env.RELEASE_METADATA_BRANCH;
const title = process.env.RELEASE_METADATA_TITLE;
const body = process.env.RELEASE_METADATA_BODY;
const files = JSON.parse(process.env.RELEASE_METADATA_FILES || '[]');
const timeoutMinutes = Number(process.env.RELEASE_METADATA_TIMEOUT_MINUTES || 60);

if (!/^[\w.-]+\/[\w.-]+$/.test(repository || '') || !/^automation\/[a-z0-9.-]+$/.test(branch || '') || !title || !body || !Array.isArray(files) || !files.length || files.some(file => typeof file !== 'string' || file.startsWith('/') || file.split('/').includes('..')) || !Number.isInteger(timeoutMinutes) || timeoutMinutes < 1) {
  throw new Error('Repository, automation branch, PR details, metadata paths, and a valid timeout are required');
}

const currentBranch = execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim();
if (currentBranch !== branch) throw new Error(`Expected checked-out branch ${branch}, found ${currentBranch}`);
execFileSync('git', ['fetch', 'origin', 'main'], { stdio: 'inherit' });

const remoteBranch = execFileSync('git', ['ls-remote', '--heads', 'origin', `refs/heads/${branch}`], { encoding: 'utf8' }).trim();
if (remoteBranch) {
  execFileSync('git', ['fetch', 'origin', `refs/heads/${branch}:refs/remotes/origin/${branch}`], { stdio: 'inherit' });
}

const changed = execFileSync('git', ['status', '--porcelain', '--', ...files], { encoding: 'utf8' }).trim();
if (changed) {
  execFileSync('git', ['add', '--', ...files], { stdio: 'inherit' });
  execFileSync('git', ['-c', 'user.name=github-actions[bot]', '-c', 'user.email=41898282+github-actions[bot]@users.noreply.github.com', 'commit', '-m', title], { stdio: 'inherit' });
}
let metadataDiffersFromMain = false;
try { execFileSync('git', ['diff', '--quiet', 'origin/main', '--', ...files], { stdio: 'ignore' }); }
catch (error) { if (error.status === 1) metadataDiffersFromMain = true; else throw error; }
if (metadataDiffersFromMain) {
  execFileSync('git', ['push', '--force-with-lease', 'origin', `HEAD:refs/heads/${branch}`], { stdio: 'inherit' });
}

const [owner] = repository.split('/');
const findPullRequest = () => JSON.parse(execFileSync('gh', [
  'pr', 'list', '--repo', repository, '--base', 'main', '--head', `${owner}:${branch}`, '--state', 'open', '--json', 'number,url',
], { encoding: 'utf8' }));

let pullRequests = findPullRequest();
if (!pullRequests.length) {
  if (!metadataDiffersFromMain) {
    console.log(`No metadata changes or open pull request for ${branch}.`);
    process.exit(0);
  }
  execFileSync('gh', [
    'pr', 'create', '--repo', repository, '--base', 'main', '--head', branch, '--title', title, '--body', body,
  ], { stdio: 'inherit' });
  pullRequests = findPullRequest();
}
if (pullRequests.length !== 1) throw new Error(`Expected one open metadata pull request for ${branch}, found ${pullRequests.length}`);

const pullRequest = pullRequests[0];
execFileSync('gh', ['pr', 'merge', String(pullRequest.number), '--repo', repository, '--auto', '--squash'], { stdio: 'inherit' });
const deadline = Date.now() + timeoutMinutes * 60_000;
while (Date.now() < deadline) {
  const state = JSON.parse(execFileSync('gh', [
    'pr', 'view', String(pullRequest.number), '--repo', repository, '--json', 'state,mergedAt,url',
  ], { encoding: 'utf8' }));
  if (state.mergedAt) {
    console.log(`Merged metadata pull request ${state.url}.`);
    process.exit(0);
  }
  if (state.state === 'CLOSED') throw new Error(`Metadata pull request was closed without merging: ${state.url}`);
  await new Promise(resolve => setTimeout(resolve, 15_000));
}
throw new Error(`Timed out waiting for required checks and automatic merge: ${pullRequest.url}`);
