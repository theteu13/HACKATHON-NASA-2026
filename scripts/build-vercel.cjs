const fs = require('node:fs/promises');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
const configuredOrigin = process.env.COSMOMEDIC_API_ORIGIN?.trim();

async function build() {
  let apiOrigin = '';
  if (configuredOrigin) {
    const parsedOrigin = new URL(configuredOrigin);
    if (!['http:', 'https:'].includes(parsedOrigin.protocol) ||
        parsedOrigin.pathname !== '/' ||
        parsedOrigin.search ||
        parsedOrigin.hash ||
        parsedOrigin.username ||
        parsedOrigin.password) {
      throw new Error('COSMOMEDIC_API_ORIGIN must be an HTTP(S) origin without a path.');
    }
    apiOrigin = parsedOrigin.origin;
  }

  await fs.mkdir(output, { recursive: true });
  await fs.copyFile(path.join(root, 'index.html'), path.join(output, 'index.html'));
  await fs.cp(path.join(root, 'src'), path.join(output, 'src'), { recursive: true });
  await fs.cp(path.join(root, 'data'), path.join(output, 'data'), { recursive: true });
  await fs.writeFile(
    path.join(output, 'src', 'deployment-config.js'),
    `window.COSMOMEDIC_CONFIG = ${JSON.stringify({
      staticDeployment: true,
      apiOrigin: apiOrigin || 'http://127.0.0.1:8000',
      autoConnect: Boolean(apiOrigin),
    })};\n`,
  );
}

build().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
