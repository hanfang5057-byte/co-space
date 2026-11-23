#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
CoSpace WorkBuddy MCP installer

Usage:
  install.sh [install|update] [--version VERSION]
  install.sh uninstall [--purge-data] [--yes]

install and update resolve the latest public npm version unless --version is set.
Uninstall preserves ~/.workbuddy/space unless --purge-data is explicitly requested.
USAGE
}

action=install
if (($#)) && [[ "$1" != -* ]]; then
  action="$1"
  shift
fi
if [[ "$action" == "-h" || "$action" == "--help" ]]; then
  usage
  exit 0
fi
if [[ "$action" != "install" && "$action" != "update" && "$action" != "uninstall" ]]; then
  usage >&2
  exit 2
fi

version=""
purge_data=0
assume_yes=0
while (($#)); do
  case "$1" in
    --version)
      (($# >= 2)) || { echo "Missing value for --version" >&2; exit 2; }
      version="$2"
      shift 2
      ;;
    --purge-data) purge_data=1; shift ;;
    --yes|-y) assume_yes=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

case "$(uname -s)" in
  Darwin|Linux) ;;
  *) echo "CoSpace WorkBuddy installer supports macOS and Linux only." >&2; exit 1 ;;
esac

command -v python3 >/dev/null 2>&1 || {
  echo "Python 3 is required to safely merge WorkBuddy's JSON config." >&2
  exit 1
}

python3 - "$action" "$version" "$purge_data" "$assume_yes" <<'PY'
import hashlib
import json
import os
import re
import shutil
import stat
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

PACKAGE = 'cospace-workbuddy-connector'
SERVER = 'cospace-review'
OWNER = 'cospace:workbuddy:v1\n'
DATA_OWNER = '.cospace-workbuddy-owner'
ACTION, REQUESTED_VERSION, PURGE_DATA, ASSUME_YES = sys.argv[1:]
PURGE_DATA = PURGE_DATA == '1'
ASSUME_YES = ASSUME_YES == '1'

home = Path(os.environ.get('HOME', str(Path.home()))).expanduser().resolve()
workbuddy_home = Path(os.environ.get('WORKBUDDY_HOME', home / '.workbuddy')).expanduser()
config = Path(os.environ.get('WORKBUDDY_CONFIG', workbuddy_home / 'mcp.json')).expanduser()
data_home = Path(os.environ.get('XDG_DATA_HOME', home / '.local' / 'share')).expanduser()
state_file = data_home / 'cospace-workbuddy' / 'install.json'
space_home = Path(os.environ.get('COSPACE_WORKBUDDY_DATA', workbuddy_home / 'space')).expanduser()
if workbuddy_home.is_symlink() or data_home.is_symlink():
    raise SystemExit('Refusing to use a symbolic link for a managed WorkBuddy directory')

def fail(message):
    raise SystemExit(message)

def ensure_plain_directory(path):
    if path.is_symlink():
        fail(f'Refusing unsafe directory: {path}')
    path.mkdir(mode=0o700, parents=True, exist_ok=True)
    if not path.is_dir():
        fail(f'Refusing unsafe directory: {path}')

def read_config():
    if config.parent.is_symlink():
        fail(f'Refusing to write through a symbolic link: {config.parent}')
    if config.is_symlink():
        fail(f'Refusing to follow a symbolic link for WorkBuddy config: {config}')
    if not config.exists():
        return {'mcpServers': {}}, False, 0o600
    if not config.is_file():
        fail(f'Refusing to replace a non-regular config file: {config}')
    try:
        value = json.loads(config.read_text(encoding='utf-8'))
    except (OSError, json.JSONDecodeError) as error:
        fail(f'Cannot safely parse {config}: {error}')
    if not isinstance(value, dict):
        fail(f'Expected a JSON object in {config}')
    value.setdefault('mcpServers', {})
    if not isinstance(value['mcpServers'], dict):
        fail(f'Expected mcpServers to be an object in {config}')
    return value, True, stat.S_IMODE(config.stat().st_mode)

def write_json_atomic(path, value, mode):
    ensure_plain_directory(path.parent)
    fd, temporary = tempfile.mkstemp(prefix=f'.{path.name}.', dir=path.parent)
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as stream:
            json.dump(value, stream, ensure_ascii=False, indent=2)
            stream.write('\n')
            stream.flush()
            os.fsync(stream.fileno())
        os.chmod(temporary, mode)
        os.replace(temporary, path)
    finally:
        try:
            os.unlink(temporary)
        except FileNotFoundError:
            pass

def backup_config():
    if config.exists():
        stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
        backup = config.with_name(f'{config.name}.cospace-backup-{stamp}')
        shutil.copy2(config, backup)
        os.chmod(backup, 0o600)
        return str(backup)
    return None

def latest_version():
    url = f'https://registry.npmjs.org/{PACKAGE}/latest'
    request = urllib.request.Request(url, headers={'Accept': 'application/json', 'User-Agent': 'cospace-workbuddy-installer'})
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            metadata = json.load(response)
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
        fail(f'Cannot resolve the latest {PACKAGE} version from npm: {error}')
    if metadata.get('name') != PACKAGE:
        fail(f'npm returned unexpected package metadata for {PACKAGE}')
    return metadata.get('version', '')

def valid_version(value):
    return bool(re.fullmatch(r'(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?', value))

def save_state(value):
    ensure_plain_directory(state_file.parent)
    write_json_atomic(state_file, value, 0o600)

def install_or_update():
    version = REQUESTED_VERSION or latest_version()
    if not valid_version(version):
        fail(f'Invalid npm version: {version!r}')
    if state_file.is_symlink():
        fail(f'Refusing to follow a symbolic link for installer state: {state_file}')
    state = None
    if state_file.exists():
        try:
            state = json.loads(state_file.read_text(encoding='utf-8'))
        except (OSError, json.JSONDecodeError) as error:
            fail(f'Cannot safely read installer state: {error}')
        if state.get('name') != SERVER or state.get('package') != PACKAGE:
            fail('Installer state does not match this CoSpace connector')
    current, existed, mode = read_config()
    servers = current['mcpServers']
    existing = servers.get(SERVER)
    if existing is not None and state is None:
        fail(f'{SERVER} already exists in {config} and is not managed by this installer; leaving it unchanged')
    if existing is not None and not is_managed_entry(existing):
        fail(f'{SERVER} was changed outside this installer; leaving it unchanged')

    old_state = state
    backup = backup_config()
    servers[SERVER] = {
        'type': 'stdio',
        'command': 'npx',
        'args': ['-y', f'{PACKAGE}@{version}'],
        'timeout': 30000,
        'runtime': {'type': 'node', 'version': '>=24.0.0'},
    }
    try:
        write_json_atomic(config, current, mode if existed else 0o600)
        save_state({
            'name': SERVER,
            'package': PACKAGE,
            'version': version,
            'createdConfig': state.get('createdConfig', not existed) if state else not existed,
            'backup': backup or (state or {}).get('backup'),
        })
    except Exception:
        if backup:
            shutil.copy2(backup, config)
            os.chmod(config, mode)
        elif not existed:
            try: config.unlink()
            except FileNotFoundError: pass
        if old_state is None:
            try: state_file.unlink()
            except FileNotFoundError: pass
        raise
    verb = 'Updated' if ACTION == 'update' or state else 'Installed'
    print(f'{verb} {PACKAGE}@{version}. WorkBuddy config: {config}')
    print(f'User data remains at {space_home}; it is not changed by install or update.')

def is_managed_entry(entry):
    return (
        isinstance(entry, dict)
        and entry.get('command') == 'npx'
        and isinstance(entry.get('args'), list)
        and any(isinstance(arg, str) and arg.startswith(PACKAGE + '@') for arg in entry['args'])
    )

def stop_review_service():
    canonical_space = home / '.workbuddy' / 'space'
    digest = hashlib.sha256(str(canonical_space).encode()).hexdigest()[:16]
    if sys.platform == 'darwin':
        for label in (f'com.cospace.workbuddy-review-{digest}', f'com.dsh-space.workbuddy-review-{digest}'):
            subprocess.run(['/bin/launchctl', 'bootout', f'gui/{os.getuid()}/{label}'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
        plist = canonical_space / '.review-http.plist'
        if plist.exists() and not plist.is_symlink() and plist.is_file():
            plist.unlink()
    elif sys.platform.startswith('linux'):
        for unit in (f'cospace-workbuddy-review-{digest}.service', f'dsh-space-workbuddy-review-{digest}.service'):
            try:
                subprocess.run(['systemctl', '--user', 'stop', unit], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
            except OSError:
                pass

def purge_user_data():
    if space_home.is_symlink():
        fail(f'Refusing to remove unsafe data path: {space_home}')
    if not space_home.exists():
        print(f'No CoSpace user data found at {space_home}.')
        return
    if not space_home.is_dir():
        fail(f'Refusing to remove unsafe data path: {space_home}')
    marker = space_home / DATA_OWNER
    if marker.is_symlink() or not marker.is_file() or marker.read_text(encoding='utf-8') != OWNER:
        fail(f'Refusing to remove data without a valid CoSpace ownership marker: {space_home}')
    if not ASSUME_YES:
        try:
            tty = open('/dev/tty', 'r+', encoding='utf-8')
        except OSError:
            fail('Purging data requires an interactive terminal or both --purge-data and --yes')
        with tty:
            tty.write(f'This permanently deletes CoSpace documents and review data in {space_home}. Close WorkBuddy first.\n')
            tty.write('Type DELETE to confirm: ')
            tty.flush()
            confirmation = tty.readline().strip()
        if confirmation != 'DELETE':
            fail('Data purge cancelled.')
    stop_review_service()
    shutil.rmtree(space_home)
    print(f'Deleted CoSpace user data at {space_home}.')

def uninstall():
    if state_file.is_symlink():
        fail(f'Refusing to follow a symbolic link for installer state: {state_file}')
    if not state_file.exists():
        fail(f'No installer record found at {state_file}; refusing to remove an unowned MCP entry')
    try:
        state = json.loads(state_file.read_text(encoding='utf-8'))
    except (OSError, json.JSONDecodeError) as error:
        fail(f'Cannot safely read installer state: {error}')
    if state.get('name') != SERVER or state.get('package') != PACKAGE:
        fail('Installer state does not match this CoSpace connector')
    current, existed, mode = read_config()
    entry = current['mcpServers'].get(SERVER)
    if entry is not None:
        if not is_managed_entry(entry):
            fail(f'{SERVER} was changed outside this installer; leaving it unchanged')
        backup = backup_config()
        del current['mcpServers'][SERVER]
        if current == {'mcpServers': {}} and state.get('createdConfig'):
            config.unlink()
        else:
            write_json_atomic(config, current, mode)
        print(f'Removed {SERVER} from {config}.')
        if backup:
            print(f'Config backup: {backup}')
    else:
        print(f'{SERVER} was already absent from {config}.')
    if PURGE_DATA:
        purge_user_data()
    else:
        print(f'Kept user data at {space_home}.')
    state_file.unlink()

if ACTION in ('install', 'update'):
    install_or_update()
else:
    uninstall()
PY
