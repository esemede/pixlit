import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

test('server-side note and voice writes enforce the plan storage quota', () => {
  assert.ok(existsSync(new URL('lib/storageQuota.ts', root)), 'missing storage quota helper');
  const quota = read('lib/storageQuota.ts');
  assert.match(quota, /getUserStorageUsage/);
  assert.match(quota, /assertStorageQuota/);
  assert.match(quota, /estimateJsonBytes/);

  const pageRoute = read('app/api/notebooks/[id]/pages/[num]/route.ts');
  assert.match(pageRoute, /assertStorageQuota/);
  assert.match(pageRoute, /existingPageBytes/);

  const voiceRoute = read('app/api/voice-notes/route.ts');
  assert.match(voiceRoute, /assertStorageQuota/);
  assert.match(voiceRoute, /file\.size/);
});

test('account surfaces storage usage and pricing exposes storage labels', () => {
  const accountPage = read('app/account/page.tsx');
  assert.match(accountPage, /getUserStorageUsage/);
  assert.match(accountPage, /storageUsedBytes/);

  const accountClient = read('app/account/AccountClient.tsx');
  assert.match(accountClient, /Almacenamiento usado/);
  assert.match(accountClient, /storageLimitLabel/);

  const pricing = read('app/pricing/page.tsx');
  assert.match(pricing, /storageLimitLabel/);
});
