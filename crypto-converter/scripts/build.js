const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const root = path.join(__dirname, '..');
const publicDir = path.join(root, 'public');
const distDir = path.join(root, 'dist');

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const copyDir = (src, dest) => {
  if (!fs.existsSync(src)) return;
  ensureDir(dest);
  fs.readdirSync(src).forEach((item) => {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    if (fs.statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
};

const build = async () => {
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
  }
  ensureDir(distDir);

  await esbuild.build({
    entryPoints: [path.join(publicDir, 'app.js')],
    bundle: true,
    minify: true,
    outfile: path.join(distDir, 'app.min.js'),
  });

  await esbuild.build({
    entryPoints: [path.join(publicDir, 'styles.css')],
    bundle: true,
    minify: true,
    outfile: path.join(distDir, 'styles.min.css'),
  });

  const indexHtml = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8')
    .replace('/styles.css', '/styles.min.css')
    .replace('/app.js', '/app.min.js');

  fs.writeFileSync(path.join(distDir, 'index.html'), indexHtml, 'utf8');
  copyDir(path.join(publicDir, 'assets'), path.join(distDir, 'assets'));
};

build().catch((err) => {
  console.error(err);
  process.exit(1);
});