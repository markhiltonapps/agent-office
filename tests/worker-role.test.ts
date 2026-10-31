import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DESKS } from '../src/shared/layout.js';
import type { WorkerInfo } from '../src/shared/protocol.js';
import { WORKER_ROLE_MAX } from '../src/shared/protocol.js';
import { restoreWorkers, saveWorkers } from '../src/server/workers/persist.js';
import type { Worker } from '../src/server/workers/types.js';
import { newWorker } from '../src/server/workers/worker.js';
import { newTracker } from '../src/server/usage.js';

const info = (role?: string): WorkerInfo => ({
  id: 'w1',
  kind: 'shell',
  deskId: DESKS[0].id,
  name: 'Pixel',
  role,
  color: '#ff8a5b',
  status: 'idle',
  acked: true,
  createdBy: 'tester',
  createdAt: 1,
  cols: 100,
  rows: 30,
  viewers: [],
  viewerIds: [],
});

/** Saves a worker to a throwaway workers.json and takes it back, as an office restarting would. */
function roundTrip(role?: string): WorkerInfo | undefined {
  const dir = mkdtempSync(path.join(tmpdir(), 'ao-role-'));
  try {
    const file = path.join(dir, 'workers.json');
    saveWorkers(file, [newWorker(info(role), newTracker())], true);
    const back = new Map<string, Worker>();
    restoreWorkers(file, back, 'claude', () => false);
    return back.get('w1')?.info;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('a worker\'s role is still there after the office restarts', () => {
  assert.equal(roundTrip('Director')?.role, 'Director');
});

test('a worker with no role has none after a restart', () => {
  assert.equal(roundTrip()?.role, undefined);
});

test('a role saved too long, or only spaces, is cut down or dropped on the way back', () => {
  assert.equal(roundTrip('x'.repeat(WORKER_ROLE_MAX + 20))?.role, 'x'.repeat(WORKER_ROLE_MAX));
  assert.equal(roundTrip('   ')?.role, undefined);
});
