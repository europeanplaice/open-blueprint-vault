import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawnSync } from 'child_process';

const repoRoot = path.resolve(__dirname, '..', '..');
const shellCandidates =
  process.platform === 'win32'
    ? ['pwsh.exe', 'powershell.exe']
    : ['pwsh', 'powershell'];

let powerShellBin: string | null = null;
for (const candidate of shellCandidates) {
  const probe = spawnSync(
    candidate,
    ['-NoProfile', '-Command', '$PSVersionTable.PSVersion.ToString()'],
    { encoding: 'utf8' },
  );
  if (probe.status === 0) {
    powerShellBin = candidate;
    break;
  }
}

const runIntegration = process.env.RUN_MANUAL_SCRIPT_INTEGRATION === '1';
const describeIfPowerShell =
  powerShellBin && runIntegration ? describe : describe.skip;

function createMockDockerBin(binDir: string): string {
  const logFile = path.join(binDir, 'docker.log');
  const mockJs = path.join(binDir, 'docker-mock.js');
  const cmdWrapper = path.join(binDir, 'docker.cmd');
  const shWrapper = path.join(binDir, 'docker');

  fs.writeFileSync(logFile, '', 'utf8');

  const mockContent = `
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const logFile = process.env.MOCK_DOCKER_LOG;

if (logFile) {
  fs.appendFileSync(logFile, args.join(' ') + '\\\\n');
}

const fail = (msg) => {
  process.stderr.write(msg + '\\\\n');
  process.exit(1);
};

const isContainerRef = (value) => /^[^\\\\/]+:\\\\//.test(value);

if (args[0] !== 'compose') {
  process.exit(0);
}

const sub = args[1];

if (sub === 'stop' || sub === 'start' || sub === 'exec') {
  process.exit(0);
}

if (sub === 'cp') {
  const src = args[2];
  const dst = args[3];
  if (!src || !dst) {
    fail('compose cp requires src and dst');
  }

  const srcIsContainer = isContainerRef(src);
  const dstIsContainer = isContainerRef(dst);

  if (srcIsContainer && !dstIsContainer) {
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.writeFileSync(dst, 'mock-from-container');
    process.exit(0);
  }

  if (!srcIsContainer && dstIsContainer) {
    if (!fs.existsSync(src)) {
      fail('missing source file: ' + src);
    }
    process.exit(0);
  }

  if (!srcIsContainer && !dstIsContainer) {
    if (!fs.existsSync(src)) {
      fail('missing source file: ' + src);
    }
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
    process.exit(0);
  }
}

process.exit(0);
`;

  fs.writeFileSync(mockJs, mockContent, 'utf8');
  fs.writeFileSync(
    cmdWrapper,
    '@echo off\r\nnode "%~dp0docker-mock.js" %*\r\n',
    'utf8',
  );
  fs.writeFileSync(
    shWrapper,
    '#!/usr/bin/env sh\nnode "$(dirname "$0")/docker-mock.js" "$@"\n',
    'utf8',
  );
  fs.chmodSync(shWrapper, 0o755);

  return logFile;
}

function runPwshScript(
  scriptPath: string,
  scriptArgs: string[],
  mockBinDir: string,
  logFile: string,
) {
  const pathSep = process.platform === 'win32' ? ';' : ':';
  return spawnSync(
    powerShellBin as string,
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, ...scriptArgs],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        MOCK_DOCKER_LOG: logFile,
        PATH: `${mockBinDir}${pathSep}${process.env.PATH ?? ''}`,
      },
    },
  );
}

function createBackupFixture(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'db.dump'), 'db', 'utf8');
  fs.writeFileSync(path.join(dir, 'minio_data.tar.gz'), 'minio', 'utf8');
  fs.writeFileSync(path.join(dir, '.env'), 'KEY=value\n', 'utf8');
}

describeIfPowerShell('Manual backup/restore scripts', () => {
  let tempRoot: string;
  let mockBinDir: string;
  let logFile: string;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'obv-script-test-'));
    mockBinDir = path.join(tempRoot, 'mock-bin');
    fs.mkdirSync(mockBinDir, { recursive: true });
    logFile = createMockDockerBin(mockBinDir);
  });

  afterEach(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it('manual-backup.ps1 creates expected artifacts and starts services again', () => {
    const backupRoot = path.join(tempRoot, 'backups');
    const script = path.join(repoRoot, 'scripts', 'manual-backup.ps1');

    const result = runPwshScript(script, ['-BackupRoot', backupRoot], mockBinDir, logFile);
    const combined = `${result.stdout}\n${result.stderr}`;

    expect(result.status).toBe(0);
    const backups = fs.readdirSync(backupRoot, { withFileTypes: true }).filter((d) => d.isDirectory());
    expect(backups).toHaveLength(1);

    const outDir = path.join(backupRoot, backups[0].name);
    expect(fs.existsSync(path.join(outDir, 'db.dump'))).toBe(true);
    expect(fs.existsSync(path.join(outDir, 'minio_data.tar.gz'))).toBe(true);
    expect(fs.existsSync(path.join(outDir, 'SHA256SUMS.txt'))).toBe(true);

    const log = fs.readFileSync(logFile, 'utf8');
    const stopAt = log.indexOf('compose stop frontend backend');
    const startAt = log.indexOf('compose start backend frontend');
    expect(stopAt).toBeGreaterThanOrEqual(0);
    expect(startAt).toBeGreaterThan(stopAt);
    expect(combined).toContain('Backup completed');
  });

  it('manual-restore.ps1 fails without -Force', () => {
    const fixture = path.join(tempRoot, 'fixture');
    createBackupFixture(fixture);
    const script = path.join(repoRoot, 'scripts', 'manual-restore.ps1');

    const result = runPwshScript(script, ['-BackupDir', fixture], mockBinDir, logFile);
    const combined = `${result.stdout}\n${result.stderr}`;

    expect(result.status).not.toBe(0);
    expect(combined).toContain('-Force');
    const log = fs.readFileSync(logFile, 'utf8');
    expect(log.trim()).toBe('');
  });

  it('manual-restore.ps1 runs restore flow with -Force', () => {
    const fixture = path.join(tempRoot, 'fixture');
    createBackupFixture(fixture);
    const script = path.join(repoRoot, 'scripts', 'manual-restore.ps1');

    const result = runPwshScript(
      script,
      ['-BackupDir', fixture, '-Force', '-RestoreEnv'],
      mockBinDir,
      logFile,
    );
    const combined = `${result.stdout}\n${result.stderr}`;
    const log = fs.readFileSync(logFile, 'utf8');

    expect(result.status).toBe(0);
    expect(log).toContain('compose cp');
    expect(log).toContain('db:/tmp/open-blueprint-vault.dump');
    expect(log).toContain('pg_restore');
    expect(log).toContain('compose start backend frontend');
    expect(combined).toContain('Restore completed');
  });
});

describe('Manual script static checks', () => {
  it('manual-backup scripts contain required backup steps', () => {
    const ps1 = fs.readFileSync(path.join(repoRoot, 'scripts', 'manual-backup.ps1'), 'utf8');
    const sh = fs.readFileSync(path.join(repoRoot, 'scripts', 'manual-backup.sh'), 'utf8');

    expect(ps1).toContain('docker compose stop frontend backend');
    expect(ps1).toContain('pg_dump -U user -d open_blueprint_vault -Fc');
    expect(ps1).toContain('SHA256SUMS.txt');

    expect(sh).toContain('docker compose stop frontend backend');
    expect(sh).toContain('pg_dump -U user -d open_blueprint_vault -Fc');
    expect(sh).toContain('SHA256SUMS.txt');
  });

  it('manual-restore scripts contain force guard and restore commands', () => {
    const ps1 = fs.readFileSync(path.join(repoRoot, 'scripts', 'manual-restore.ps1'), 'utf8');
    const sh = fs.readFileSync(path.join(repoRoot, 'scripts', 'manual-restore.sh'), 'utf8');

    expect(ps1).toContain('Re-run with -Force');
    expect(ps1).toContain('pg_restore -U user -d open_blueprint_vault');
    expect(ps1).toContain('rm -rf /data/*');

    expect(sh).toContain('--force to continue');
    expect(sh).toContain('pg_restore -U user -d open_blueprint_vault');
    expect(sh).toContain('rm -rf /data/*');
  });
});
