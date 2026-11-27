/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { createAccount } from '@/db/accounts';
import { hasOwnData, hasSampleData, loadSampleData, removeSampleData } from '@/db/sample-data';
import { migratedTestDb } from '@/db/test-db';

describe('hasOwnData', () => {
  test('ignores sample rows and notices the first own account', async () => {
    const db = await migratedTestDb();
    assert.equal(await hasOwnData(db), false);

    await loadSampleData(db);
    assert.equal(await hasSampleData(db), true);
    assert.equal(await hasOwnData(db), false);

    await createAccount(db, { id: 'acc', name: 'HDFC', type: 'bank', subType: null, balance: 1000, icon: null, color: null, creditLimit: null, billingDay: null, dueDay: null, customTypeId: null, logoUrl: null });
    assert.equal(await hasOwnData(db), true);

    await removeSampleData(db);
    assert.equal(await hasSampleData(db), false);
    assert.equal(await hasOwnData(db), true);
  });
});
