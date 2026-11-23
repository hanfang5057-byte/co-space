import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { resolveWorkBuddySpaceHome } from '../runtime/paths.js';

test('uses a fixed WorkBuddy-only home and writes an ownership marker', () => {
  const temporaryHome = mkdtempSync(path.join(os.tmpdir(), 'space-workbuddy-home-'));
  const originalHome = process.env.HOME;
  process.env.HOME = temporaryHome;
  try {
    const result = resolveWorkBuddySpaceHome();
    assert.equal(result.home, path.join(realpathSync(temporaryHome), '.workbuddy', 'space'));
    assert.equal(result.databaseFile, path.join(result.home, 'review.sqlite'));
    assert.equal(readFileSync(path.join(result.home, '.cospace-workbuddy-owner'), 'utf8'), 'cospace:workbuddy:v1\n');
    assert.equal(resolveWorkBuddySpaceHome().home, result.home);
  } finally {
    if (originalHome === undefined) delete process.env.HOME;
    else process.env.HOME = originalHome;
    rmSync(temporaryHome, { recursive: true, force: true });
  }
});

test('migrates the prior WorkBuddy ownership marker without touching data', () => {
  const temporaryHome = mkdtempSync(path.join(os.tmpdir(), 'space-workbuddy-legacy-'));
  const spaceHome = path.join(temporaryHome, '.workbuddy', 'space');
  mkdirSync(spaceHome, { recursive: true });
  writeFileSync(path.join(spaceHome, '.dsh-space-workbuddy-owner'), 'dsh-space-workbuddy:v1\n');
  writeFileSync(path.join(spaceHome, 'review.sqlite'), 'synthetic database');
  const originalHome = process.env.HOME;
  process.env.HOME = temporaryHome;
  try {
    const result = resolveWorkBuddySpaceHome();
    assert.equal(readFileSync(path.join(result.home, 'review.sqlite'), 'utf8'), 'synthetic database');
    assert.equal(readFileSync(path.join(result.home, '.cospace-workbuddy-owner'), 'utf8'), 'cospace:workbuddy:v1\n');
    assert.equal(existsSync(path.join(result.home, '.dsh-space-workbuddy-owner')), false);
  } finally {
    if (originalHome === undefined) delete process.env.HOME;
    else process.env.HOME = originalHome;
    rmSync(temporaryHome, { recursive: true, force: true });
  }
});

test('refuses to adopt an unmarked database directory', () => {
  const temporaryHome = mkdtempSync(path.join(os.tmpdir(), 'space-workbuddy-unowned-'));
  mkdirSync(path.join(temporaryHome, '.workbuddy', 'space'), { recursive: true });
  writeFileSync(path.join(temporaryHome, '.workbuddy', 'space', 'review.sqlite'), 'existing data');
  const originalHome = process.env.HOME;
  process.env.HOME = temporaryHome;
  try {
    assert.throws(resolveWorkBuddySpaceHome, /unowned, non-empty/);
  } finally {
    if (originalHome === undefined) delete process.env.HOME;
    else process.env.HOME = originalHome;
    rmSync(temporaryHome, { recursive: true, force: true });
  }
});

test('refuses a symlinked WorkBuddy data directory', () => {
  const temporaryHome = mkdtempSync(path.join(os.tmpdir(), 'space-workbuddy-link-'));
  mkdirSync(path.join(temporaryHome, '.workbuddy'));
  const elsewhere = path.join(temporaryHome, 'elsewhere');
  mkdirSync(elsewhere);
  symlinkSync(elsewhere, path.join(temporaryHome, '.workbuddy', 'space'));
  const originalHome = process.env.HOME;
  process.env.HOME = temporaryHome;
  try {
    assert.throws(resolveWorkBuddySpaceHome, /real directories only/);
  } finally {
    if (originalHome === undefined) delete process.env.HOME;
    else process.env.HOME = originalHome;
    rmSync(temporaryHome, { recursive: true, force: true });
  }
});
