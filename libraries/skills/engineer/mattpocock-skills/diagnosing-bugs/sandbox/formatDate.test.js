const { test } = require('node:test');
const assert = require('node:assert');
const { formatDate } = require('./formatDate');

test('formats mid-month date with correct month (reported bug: month off by one)', () => {
  assert.strictEqual(formatDate('2024-05-15'), 'May 15, 2024');
});

test('month boundaries do not shift to previous month', () => {
  assert.strictEqual(formatDate('2024-01-15'), 'Jan 15, 2024');
  assert.strictEqual(formatDate('2024-12-15'), 'Dec 15, 2024');
});

test('date-only ISO input is not shifted by local timezone', () => {
  // Under TZ=America/New_York the buggy UTC-midnight parse yields "Apr 14".
  assert.strictEqual(formatDate('2024-05-15'), 'May 15, 2024');
  assert.strictEqual(formatDate('2024-01-01'), 'Jan 1, 2024');
});
