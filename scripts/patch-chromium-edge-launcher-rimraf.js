'use strict';

const fs = require('fs');
const path = require('path');

const file = path.join(
  __dirname,
  '..',
  'node_modules',
  'chromium-edge-launcher',
  'dist',
  'edge-launcher.js'
);

if (!fs.existsSync(file)) {
  process.exit(0);
}

let source = fs.readFileSync(file, 'utf8');
if (source.includes('// rimraf@5 patch')) {
  process.exit(0);
}

const beforeRequire = 'const rimraf = require("rimraf");';
const afterRequire =
  'const { rimraf } = require("rimraf"); // rimraf@5 patch';
const beforeCall = 'this.rimraf(this.userDataDir, () => resolve());';
const afterCall =
  'void Promise.resolve(this.rimraf(this.userDataDir)).then(() => resolve(), () => resolve()); // rimraf@5 patch';

if (!source.includes(beforeRequire) || !source.includes(beforeCall)) {
  process.exit(0);
}

fs.writeFileSync(
  file,
  source.replace(beforeRequire, afterRequire).replace(beforeCall, afterCall)
);
