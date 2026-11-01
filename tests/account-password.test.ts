import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Accounts, type Account } from '../src/server/accounts.js';

/** An office's accounts with one in it, "Mark" (password "first password"), in a throwaway folder. */
async function withMark(run: (accounts: Accounts, mark: Account, dir: string) => Promise<void>) {
  const dir = mkdtempSync(path.join(tmpdir(), 'ao-pw-'));
  try {
    const accounts = new Accounts(dir);
    const invite = accounts.invite('test', 'admin', 'Mark');
    assert.ok(typeof invite !== 'string');
    const mark = await accounts.join(invite.token, 'Mark', 'first password');
    assert.ok(typeof mark !== 'string');
    await run(accounts, mark, dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('an account can change its password, and only the new one signs in afterwards', async () => {
  await withMark(async (accounts, mark) => {
    assert.equal(await accounts.setPassword(mark.id, 'first password', 'second password'), undefined);
    assert.equal(await accounts.check('Mark', 'first password'), undefined);
    assert.equal((await accounts.check('Mark', 'second password'))?.id, mark.id);
  });
});

test('the new password is kept when the office restarts', async () => {
  await withMark(async (accounts, mark, dir) => {
    await accounts.setPassword(mark.id, 'first password', 'second password');
    const again = new Accounts(dir);
    assert.equal((await again.check('Mark', 'second password'))?.id, mark.id);
    assert.equal(await again.check('Mark', 'first password'), undefined);
  });
});

test('a wrong current password, a short new one or a gone account change nothing', async () => {
  await withMark(async (accounts, mark) => {
    assert.match((await accounts.setPassword(mark.id, 'not it', 'second password')) ?? '', /current password/);
    assert.match((await accounts.setPassword(mark.id, 'first password', 'short')) ?? '', /at least 8/);
    assert.match((await accounts.setPassword(mark.id, 'first password', 'x'.repeat(600))) ?? '', /too long/);
    assert.match((await accounts.setPassword('nobody', 'first password', 'second password')) ?? '', /gone/);
    assert.equal((await accounts.check('Mark', 'first password'))?.id, mark.id);
  });
});
