#!/usr/bin/env node
// mdtoc — 从 Markdown 文件（或 stdin）生成目录
const fs = require('fs');

const input = process.argv[2]
  ? fs.readFileSync(process.argv[2], 'utf8')
  : fs.readFileSync(0, 'utf8');

const lines = input.split('\n').filter((l) => /^#{1,6} /.test(l));
for (const line of lines) {
  const level = line.match(/^#+/)[0].length;
  const text = line.replace(/^#+ /, '');
  console.log('  '.repeat(level - 1) + '- ' + text);
}
