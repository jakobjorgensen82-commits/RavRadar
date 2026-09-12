import assert from 'node:assert/strict';
import { sourceTreeContentSha256, sourceTreeProofArtifactName } from './lib/source-tree-content.mjs';

const oidA = 'a'.repeat(40);
const oidB = 'b'.repeat(40);
const blobs = new Map([[oidA, Buffer.from('alpha\n')], [oidB, Buffer.from('beta\n')]]);

function mockGit(tree) {
  return (args, options = {}) => {
    if (args[0] === 'ls-tree') return Buffer.from(tree.join('\0') + '\0');
    if (args[0] !== 'cat-file') throw new Error('Unexpected git command');
    const requested = options.input.toString('ascii').trim().split('\n');
    return Buffer.concat(requested.flatMap(oid => {
      const blob = blobs.get(oid);
      return [Buffer.from(`${oid} blob ${blob.length}\n`), blob, Buffer.from('\n')];
    }));
  };
}

const baseTree = [`100644 blob ${oidA}\ta.txt`, `100755 blob ${oidB}\tscripts/b.sh`];
const first = sourceTreeContentSha256('HEAD', { git: mockGit(baseTree) });
const second = sourceTreeContentSha256('OTHER', { git: mockGit(baseTree) });
assert.equal(first, second);
assert.match(first, /^sha256:[a-f0-9]{64}$/);
blobs.set(oidA, Buffer.from('changed\n'));
assert.notEqual(sourceTreeContentSha256('HEAD', { git: mockGit(baseTree) }), first);
blobs.set(oidA, Buffer.from('alpha\n'));
assert.notEqual(sourceTreeContentSha256('HEAD', {
  git: mockGit([`100755 blob ${oidA}\ta.txt`, baseTree[1]]),
}), first);
assert.equal(
  sourceTreeProofArtifactName({
    pullRequestNumber: 7,
    headSha: 'c'.repeat(40),
    sourceTreeSha256: first,
  }),
  `ravradar-source-validation-v2-pr-7-${'c'.repeat(40)}-${first.slice(7)}`,
);

console.log('Deterministic SHA-256 source-tree content manifest tests passed.');
