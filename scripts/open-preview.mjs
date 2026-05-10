import { spawn } from 'node:child_process';

const previewUrl = 'http://localhost:8788';

await run('npm', ['run', 'build']);
await run('npx', ['wrangler', 'd1', 'migrations', 'apply', 'accmgmt', '--local'], {
  CI: '1',
});

const server = spawn('npx', ['wrangler', 'pages', 'dev', 'dist', '--d1', 'DB=accmgmt', '--compatibility-date=2026-05-09'], {
  stdio: 'inherit',
  env: process.env,
});

const openTimer = setTimeout(() => {
  openBrowser(previewUrl);
}, 1800);

process.on('SIGINT', () => {
  clearTimeout(openTimer);
  server.kill('SIGINT');
});

server.on('exit', (code) => {
  clearTimeout(openTimer);
  process.exit(code ?? 0);
});

function run(command, args, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      env: {
        ...process.env,
        ...extraEnv,
      },
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} exited with ${code}`));
      }
    });
  });
}

function openBrowser(url) {
  const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', url] : [url];
  const opener = spawn(command, args, { stdio: 'ignore', detached: true });
  opener.unref();
}
