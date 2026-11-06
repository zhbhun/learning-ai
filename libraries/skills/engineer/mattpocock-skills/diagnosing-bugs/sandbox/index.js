const { formatDate } = require('./formatDate');

const input = process.argv[2];
if (!input) {
  console.error('Usage: node index.js <ISO date, e.g. 2024-05-15>');
  process.exit(1);
}

console.log(`Invoice date: ${formatDate(input)}`);
