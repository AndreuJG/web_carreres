import assert from 'node:assert/strict';
import {execFileSync, spawnSync} from 'node:child_process';
import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import test from 'node:test';

const script = fileURLToPath(new URL('../scripts/publish-sync.mjs', import.meta.url));
const env = {...process.env, GITHUB_ACTIONS: 'true', GITHUB_TOKEN: 'local-test',
  GITHUB_REPOSITORY: 'AndreuJG/web_carreres', GITHUB_REF: 'refs/heads/main'};
const git = (cwd, ...args) => execFileSync('git', args, {cwd, encoding: 'utf8', stdio: 'pipe'}).trim();

for (const path of ['vercel.json', 'data/races.json']) {
  test(`publicació amb un canvi concurrent en ${path}`, t => {
    const root = mkdtempSync(join(tmpdir(), 'publish-races-'));
    t.after(() => rmSync(root, {recursive: true, force: true}));
    git(root, 'init', '--bare', '--initial-branch=main', 'remote.git');
    git(root, 'clone', 'remote.git', 'editor');
    const editor = join(root, 'editor');
    const bot = join(root, 'bot');
    const commit = message => {
      git(editor, 'add', '.');
      git(editor, '-c', 'user.name=Test', '-c', 'user.email=test@example.com', 'commit', '-m', message);
    };
    mkdirSync(join(editor, 'data'));
    writeFileSync(join(editor, 'data/races.json'), 'baseline');
    writeFileSync(join(editor, 'data/sync-status.json'), 'baseline report');
    commit('baseline');
    git(editor, 'push', 'origin', 'main');
    git(root, 'clone', '--depth=1', pathToFileURL(join(root, 'remote.git')).href, 'bot');
    writeFileSync(join(bot, 'data/races.json'), 'validated races');
    writeFileSync(join(bot, 'data/sync-status.json'), 'validated report');
    writeFileSync(join(editor, path), 'concurrent change');
    commit('concurrent change');
    git(editor, 'push', 'origin', 'main');

    const result = spawnSync(process.execPath, [script], {cwd: bot, env, encoding: 'utf8'});
    git(editor, 'fetch', 'origin');
    assert.equal(git(editor, 'show', `origin/main:${path}`), 'concurrent change');
    if (path === 'data/races.json') {
      assert.equal(result.status, 1);
      assert.match(result.stderr, /Han canviat les dades o els lectors/);
      assert.equal(git(editor, 'show', 'origin/main:data/sync-status.json'), 'baseline report');
    } else {
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /Es reprén la publicació/);
      assert.equal(git(editor, 'show', 'origin/main:data/races.json'), 'validated races');
      assert.equal(git(editor, 'show', 'origin/main:data/sync-status.json'), 'validated report');
    }
  });
}
