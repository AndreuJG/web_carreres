import { cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname, basename } from 'node:path';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const output = resolve(root, 'dist');
if (dirname(output) !== root || basename(output) !== 'dist') {
  throw new Error('El directori de publicació ha de ser dist dins del projecte.');
}
await rm(output, { recursive: true, force: true });
await mkdir(output);
const publicFiles = ['index.html', 'styles.css', 'app.js', 'assets', 'lib', 'data'];
for (const file of publicFiles) {
  await cp(resolve(root, file), resolve(output, file), { recursive: true });
}
console.log('Web estàtica preparada en dist/ per a Vercel.');
