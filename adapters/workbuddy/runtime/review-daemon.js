import { createHash, randomBytes, randomInt } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { lstatSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SpaceService } from '../../../packages/review-core/src/space-service.js';
import { createWorkBuddyApi } from './api.js';
import { createReviewHttpServer } from './http-server.js';

const STATE_FILE = '.review-http.json';
const LAUNCHD_FILE = '.review-http.plist';
const TASK_FILE = '.review-http-task.xml';
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

function statePath(home) { return path.join(home, STATE_FILE); }
function launchdPath(home) { return path.join(home, LAUNCHD_FILE); }
function taskPath(home) { return path.join(home, TASK_FILE); }
function serviceId(home) { return createHash('sha256').update(home).digest('hex').slice(0, 16); }
function launchdLabel(home) { return `com.dsh-space.workbuddy-review-${serviceId(home)}`; }
function systemdUnit(home) { return `dsh-space-workbuddy-review-${serviceId(home)}.service`; }
function taskName(home) { return `DshSpaceWorkBuddyReview_${serviceId(home)}`; }
function launchdDomain() { return `gui/${process.getuid()}`; }
function xml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

function createLaunchdPlist(home, entryFile, state) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict><key>Label</key><string>${launchdLabel(home)}</string><key>ProgramArguments</key><array><string>${xml(process.execPath)}</string><string>${xml(entryFile)}</string><string>--review-daemon</string><string>${xml(statePath(home))}</string></array><key>EnvironmentVariables</key><dict><key>HOME</key><string>${xml(os.homedir())}</string></dict><key>RunAtLoad</key><true/><key>KeepAlive</key><false/><key>StandardOutPath</key><string>/dev/null</string><key>StandardErrorPath</key><string>/dev/null</string></dict></plist>\n`;
}

function createTaskXml(home, entryFile) {
  const user = process.env.USERDOMAIN && process.env.USERNAME
    ? `${process.env.USERDOMAIN}\\${process.env.USERNAME}`
    : os.userInfo().username;
  const args = `"${entryFile}" --review-daemon "${statePath(home)}"`;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<Task version="1.4" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task"><RegistrationInfo><Description>Temporary local WorkBuddy Space review server</Description></RegistrationInfo><Triggers><TimeTrigger><StartBoundary>2099-01-01T00:00:00</StartBoundary><Enabled>true</Enabled></TimeTrigger></Triggers><Principals><Principal id="Author"><UserId>${xml(user)}</UserId><LogonType>InteractiveToken</LogonType><RunLevel>LeastPrivilege</RunLevel></Principal></Principals><Settings><MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy><StartWhenAvailable>false</StartWhenAvailable><Enabled>true</Enabled><AllowStartOnDemand>true</AllowStartOnDemand><ExecutionTimeLimit>PT0S</ExecutionTimeLimit><Priority>7</Priority></Settings><Actions Context="Author"><Exec><Command>${xml(process.execPath)}</Command><Arguments>${xml(args)}</Arguments><WorkingDirectory>${xml(path.dirname(entryFile))}</WorkingDirectory></Exec></Actions></Task>`;
}

function runLaunchctl(args) {
  const result = spawnSync('/bin/launchctl', args, { encoding: 'utf8', timeout: 5000 });
  if (result.error) throw result.error;
  return result;
}

function bootoutLaunchd(home) {
  if (process.platform !== 'darwin') return;
  const result = runLaunchctl(['bootout', `${launchdDomain()}/${launchdLabel(home)}`]);
  if (result.status !== 0) return;
}

function runSystemctl(args) {
  return spawnSync('systemctl', ['--user', ...args], { encoding: 'utf8', timeout: 5000 });
}

function stopPlatformService(home) {
  if (process.platform === 'darwin') {
    runLaunchctl(['bootout', `${launchdDomain()}/${launchdLabel(home)}`]);
    removeLaunchdPlist(home);
  } else if (process.platform === 'linux') {
    const result = runSystemctl(['stop', systemdUnit(home)]);
    if (result.error?.code !== 'ENOENT') runSystemctl(['reset-failed', systemdUnit(home)]);
  } else if (process.platform === 'win32') {
    spawnSync('schtasks.exe', ['/Delete', '/TN', taskName(home), '/F'], { encoding: 'utf8', timeout: 5000 });
    try { unlinkSync(taskPath(home)); } catch {}
  }
}

function startSystemdService(home, entryFile) {
  const result = spawnSync('systemd-run', [
    '--user', '--quiet', '--collect', `--unit=${systemdUnit(home)}`,
    '--property=Type=exec', '--property=KillMode=process',
    process.execPath, entryFile, '--review-daemon', statePath(home),
  ], { encoding: 'utf8', timeout: 10000 });
  if (result.error?.code === 'ENOENT') return false;
  if (result.error || result.status !== 0) return false;
  return true;
}

function startWindowsTask(home, entryFile) {
  const taskFile = taskPath(home);
  writeFileSync(taskFile, createTaskXml(home, entryFile), { mode: 0o600, flag: 'wx', encoding: 'utf8' });
  const create = spawnSync('schtasks.exe', ['/Create', '/TN', taskName(home), '/XML', taskFile, '/F'], { encoding: 'utf8', timeout: 10000 });
  try { unlinkSync(taskFile); } catch {}
  if (create.error || create.status !== 0) throw new Error((create.stderr || create.error?.message || 'Could not register the WorkBuddy review task').trim());
  const start = spawnSync('schtasks.exe', ['/Run', '/TN', taskName(home)], { encoding: 'utf8', timeout: 10000 });
  if (start.error || start.status !== 0) {
    spawnSync('schtasks.exe', ['/Delete', '/TN', taskName(home), '/F'], { encoding: 'utf8', timeout: 5000 });
    throw new Error((start.stderr || start.error?.message || 'Could not start the WorkBuddy review task').trim());
  }
}

function removeLaunchdPlist(home) {
  try {
    const stat = lstatSync(launchdPath(home));
    if (stat.isSymbolicLink() || !stat.isFile()) throw new Error('Review service launch configuration must be a regular file');
    unlinkSync(launchdPath(home));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

function readState(home) {
  const file = statePath(home);
  try {
    const stat = lstatSync(file);
    if (stat.isSymbolicLink() || !stat.isFile()) throw new Error('Review server state must be a regular file');
    const state = JSON.parse(readFileSync(file, 'utf8'));
    if (!Number.isInteger(state.port) || state.port < 1 || state.port > 65535 || typeof state.token !== 'string' || !/^[a-f0-9]{64}$/.test(state.token)) {
      throw new Error('Review server state is invalid');
    }
    return state;
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

function writeState(home, state) {
  writeFileSync(statePath(home), `${JSON.stringify(state)}\n`, { mode: 0o600, flag: 'wx' });
}

function removeState(home, token) {
  const file = statePath(home);
  try {
    const state = readState(home);
    if (state?.token === token) unlinkSync(file);
  } catch {}
}

async function isReady(state) {
  try {
    const response = await fetch(`http://127.0.0.1:${state.port}/health`, {
      headers: { 'x-workbuddy-review-token': state.token },
      signal: AbortSignal.timeout(500),
    });
    return response.ok && (await response.json()).service === 'workbuddy-space-review';
  } catch { return false; }
}

export async function ensureReviewDaemon(home, entryFile) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const current = readState(home);
    if (current && await isReady(current)) return `http://127.0.0.1:${current.port}`;
    if (current) {
      stopPlatformService(home);
      removeState(home, current.token);
    } else stopPlatformService(home);

    const state = { port: randomInt(49152, 65536), token: randomBytes(32).toString('hex'), pid: 0 };
    try { writeState(home, state); }
    catch (error) {
      if (error.code === 'EEXIST') continue;
      throw error;
    }

    try {
      if (process.platform === 'darwin') {
        removeLaunchdPlist(home);
        writeFileSync(launchdPath(home), createLaunchdPlist(home, entryFile, state), { mode: 0o600, flag: 'wx' });
        const result = runLaunchctl(['bootstrap', launchdDomain(), launchdPath(home)]);
        if (result.status !== 0) throw new Error((result.stderr || 'Could not start the local review page service').trim());
      } else if (process.platform === 'linux') {
        if (!startSystemdService(home, entryFile)) throw new Error('A working systemd --user service manager is required for the local review page on Linux');
      } else if (process.platform === 'win32') {
        startWindowsTask(home, entryFile);
      } else {
        throw new Error(`Persistent local review service is not supported on ${process.platform}`);
      }
    } catch (error) {
      removeState(home, state.token);
      try { stopPlatformService(home); } catch {}
      throw error;
    }
    writeFileSync(statePath(home), `${JSON.stringify(state)}\n`, { mode: 0o600 });

    for (let check = 0; check < 30; check += 1) {
      if (await isReady(state)) return `http://127.0.0.1:${state.port}`;
      await wait(100);
    }
    removeState(home, state.token);
  }
  throw new Error('Local review page service did not become ready');
}

export async function touchReviewDaemon(home) {
  const state = readState(home);
  return state ? isReady(state) : false;
}

export async function runReviewDaemon() {
  const home = path.join(os.homedir(), '.workbuddy', 'space');
  const runtimeState = process.argv[3] ? readState(path.dirname(process.argv[3])) : null;
  const token = runtimeState?.token || process.env.WORKBUDDY_REVIEW_TOKEN;
  const port = Number(runtimeState?.port || process.env.WORKBUDDY_REVIEW_PORT);
  if (!token || !/^[a-f0-9]{64}$/.test(token) || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Review service configuration is invalid');
  }
  const service = new SpaceService(home);
  let idleTimer;
  let closing = false;
  const close = async () => {
    if (closing) return;
    closing = true;
    clearTimeout(idleTimer);
    await web.close().catch(() => {});
    service.close();
    removeState(home, token);
    try { stopPlatformService(home); } catch {}
  };
  const touch = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { void close(); }, IDLE_TIMEOUT_MS);
    idleTimer.unref();
  };
  const web = createReviewHttpServer(createWorkBuddyApi(service), { healthToken: token, onRequest: touch });
  try {
    await web.listen(port);
    touch();
    process.once('SIGINT', () => { void close(); });
    process.once('SIGTERM', () => { void close(); });
    process.once('uncaughtException', () => { void close(); });
  } catch (error) {
    service.close();
    removeState(home, token);
    throw error;
  }
}
