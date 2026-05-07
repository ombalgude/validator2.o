const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(rootDir, '..');
const contractSource = fs.readFileSync(path.join(rootDir, 'contract.sol'), 'utf8');
const blockchainConfig = fs.readFileSync(
  path.join(repoRoot, 'backend', 'config', 'blockchain.js'),
  'utf8'
);

[
  'function addDocument(bytes32 _hash)',
  'function revokeDocument(bytes32 _hash)',
  'function verifyDocument(bytes32 _hash)',
].forEach((signature) => {
  const solidityName = signature.match(/function\s+(\w+)/)?.[1];
  assert.ok(
    solidityName && contractSource.includes(`function ${solidityName}`),
    `contract.sol is missing ${solidityName}`
  );
  assert.ok(
    blockchainConfig.includes(signature),
    `backend blockchain ABI is missing ${signature}`
  );
});

assert.ok(
  contractSource.includes('onlyAuthorized'),
  'contract.sol should keep document mutations behind issuer authorization'
);

console.log('Contract/API check passed');
