'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Media uploads bypass the shared JSON request() helper because they send FormData.
// Keep their bearer-only transport policy aligned with src/lib/api.ts.
test('authenticated media uploads explicitly omit browser credentials', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/lib/social-feed-api.ts'), 'utf8');
  const upload = source.match(/async function sendMedia\([\s\S]*?\n}\n/);
  assert.ok(upload, 'expected sendMedia upload implementation');
  assert.match(upload[0], /fetch\(`\$\{API_BASE}\$\{path}`,\s*\{[\s\S]*?credentials:\s*'omit'/);
  assert.match(upload[0], /Authorization:\s*`Bearer \$\{token}`/);
  assert.doesNotMatch(upload[0], /['"]Cookie['"]\s*:/);
});
