/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { isNewerVersion, pickApk, summarizeNotes } from '@/lib/release-info';

describe('update check', () => {
  test('compares versions number by number', () => {
    assert.equal(isNewerVersion('1.10.0', '1.9.2'), true);
    assert.equal(isNewerVersion('1.8.0', '1.8.0'), false);
    assert.equal(isNewerVersion('1.8', '1.8.1'), false);
    assert.equal(isNewerVersion('2.0.0', '1.99.99'), true);
  });

  test("picks the APK for the phone's processor, else the universal one", () => {
    const assets = ['arm64-v8a', 'armeabi-v7a', 'universal'].map((abi) => ({
      name: `SpendTrak-1.9.0-${abi}.apk`,
      size: 1,
      browser_download_url: abi,
    }));
    assert.equal(pickApk(assets, ['arm64-v8a', 'armeabi-v7a'])?.browser_download_url, 'arm64-v8a');
    assert.equal(pickApk(assets, ['armeabi-v7a', 'armeabi'])?.browser_download_url, 'armeabi-v7a');
    assert.equal(pickApk(assets, ['x86_64'])?.browser_download_url, 'universal');
    assert.equal(pickApk([], ['arm64-v8a']), null);
  });

  test('summarizes Markdown release notes as their first paragraph', () => {
    const body = '# SpendTrak 1.9.0\n\n**Google Drive sync** is here, with [daily copies](https://x).\nSecond line.\n\n## More\n- item';
    assert.equal(summarizeNotes(body), 'Google Drive sync is here, with daily copies. Second line.');
    assert.equal(summarizeNotes(''), null);
    assert.equal(summarizeNotes('a'.repeat(300))?.length, 160);
  });
});
