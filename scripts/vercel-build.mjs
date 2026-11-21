import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const MAX_WAIT_MS = 210_000;
const POLL_INTERVAL_MS = 4_000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runStandardLocalBuild(reason) {
  console.log(`[vercel-build] Running standard local Vite build (${reason})...`);
  execSync('npx vite build', {
    stdio: 'inherit',
    env: {
      ...process.env,
      VITE_CDN_BASE_URL: '',
      VITE_CDN_TAG: '',
    },
  });
}

async function fetchWithTimeout(url, timeoutMs = 12_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { 'Cache-Control': 'no-cache' },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchTextFromCdnOrRaw(cdnUrl, rawUrl) {
  try {
    const res = await fetchWithTimeout(cdnUrl);
    if (res.ok) {
      return Buffer.from(await res.arrayBuffer());
    }
  } catch {
    // Fallback to raw GitHub URL below
  }

  const rawRes = await fetchWithTimeout(rawUrl);
  if (!rawRes.ok) {
    throw new Error(`Failed to fetch ${cdnUrl} and ${rawUrl} (HTTP ${rawRes.status})`);
  }
  return Buffer.from(await rawRes.arrayBuffer());
}

async function waitForJsDelivrBuild(repo, tag) {
  const cdnBase = `https://cdn.jsdelivr.net/gh/${repo}@${tag}/dist`;
  const rawBase = `https://raw.githubusercontent.com/${repo}/${tag}/dist`;
  const metaCdnUrl = `${cdnBase}/cdn-build-meta.json`;
  const metaRawUrl = `${rawBase}/cdn-build-meta.json`;
  const startedAt = Date.now();
  let attempt = 0;

  console.log(`[vercel-build] Waiting for GitHub Actions CDN bundle @${tag} (${repo})...`);

  while (Date.now() - startedAt < MAX_WAIT_MS) {
    attempt += 1;
    try {
      const metaRes = await fetchWithTimeout(metaCdnUrl);
      if (metaRes.ok) {
        const meta = await metaRes.json();
        const entryAssets = Array.isArray(meta.entryAssets) ? meta.entryAssets : [];

        // Verify all entry JS/CSS assets on jsDelivr return HTTP 200 before Vercel goes live
        let allAssetsReady = true;
        for (const assetRelPath of entryAssets) {
          const cleanAsset = String(assetRelPath).replace(/^\/+/, '');
          const assetUrl = `${cdnBase}/${cleanAsset}`;
          const assetRes = await fetchWithTimeout(assetUrl);
          if (!assetRes.ok) {
            allAssetsReady = false;
            console.log(
              `[vercel-build] Attempt #${attempt}: waiting for ${cleanAsset} on jsDelivr (HTTP ${assetRes.status})...`
            );
            break;
          }
        }

        if (allAssetsReady) {
          console.log(
            `[vercel-build] Verified jsDelivr HTTP 200 OK for ${entryAssets.length} entry asset(s).`
          );
          return { meta, cdnBase, rawBase };
        }
      } else if (attempt === 1 || attempt % 5 === 0) {
        console.log(
          `[vercel-build] Attempt #${attempt}: CDN metadata not ready yet (HTTP ${metaRes.status}).`
        );
      }
    } catch (err) {
      if (attempt === 1 || attempt % 5 === 0) {
        console.log(
          `[vercel-build] Attempt #${attempt}: waiting for tag @${tag} (${err?.message || 'pending'})...`
        );
      }
    }

    await sleep(POLL_INTERVAL_MS);
  }

  // Final probe of raw GitHub just for diagnostics
  try {
    const diag = await fetchWithTimeout(metaRawUrl, 5_000);
    console.warn(`[vercel-build] Timed out waiting for jsDelivr (raw status: ${diag.status}).`);
  } catch {
    console.warn('[vercel-build] Timed out waiting for GitHub Actions CDN tag.');
  }

  return null;
}

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function main() {
  const isVercelProdMain =
    process.env.VERCEL === '1' &&
    process.env.VERCEL_ENV === 'production' &&
    process.env.VERCEL_GIT_COMMIT_REF === 'main';

  const isCdnDisabled =
    process.env.VITE_DISABLE_CDN === 'true' || process.env.VITE_DISABLE_CDN === '1';

  if (isCdnDisabled) {
    runStandardLocalBuild('VITE_DISABLE_CDN emergency switch is enabled');
    return;
  }

  if (!isVercelProdMain) {
    runStandardLocalBuild('non-production or preview branch');
    return;
  }

  const repo =
    (process.env.VITE_CDN_REPO || '').trim() ||
    (process.env.VERCEL_GIT_REPO_OWNER && process.env.VERCEL_GIT_REPO_SLUG
      ? `${process.env.VERCEL_GIT_REPO_OWNER}/${process.env.VERCEL_GIT_REPO_SLUG}`
      : '');

  const commitSha = (process.env.VERCEL_GIT_COMMIT_SHA || '').trim();

  if (!repo || !commitSha) {
    runStandardLocalBuild('missing Vercel git repository/commit metadata');
    return;
  }

  const shortSha = commitSha.slice(0, 12);
  const tag = `cdn-${shortSha}`;

  const ready = await waitForJsDelivrBuild(repo, tag);
  if (!ready) {
    runStandardLocalBuild('CDN build wait timed out - safe fallback to Vercel origin');
    return;
  }

  const { meta, cdnBase, rawBase } = ready;
  const distDir = path.resolve(process.cwd(), 'dist');
  const publicDir = path.resolve(process.cwd(), 'public');

  fs.rmSync(distDir, { recursive: true, force: true });
  fs.mkdirSync(distDir, { recursive: true });

  // Copy public static assets (icons, robots.txt, assets/ if any) to dist/
  copyDirRecursive(publicDir, distDir);

  const rootFiles = Array.isArray(meta.rootFiles) ? meta.rootFiles : [];
  const filesToDownload = Array.from(new Set(rootFiles)).filter(
    (f) => typeof f === 'string' && f && !f.startsWith('.') && !f.includes('..') && !f.includes('/')
  );

  try {
    if (!filesToDownload.includes('index.html') || !filesToDownload.includes('sw.js')) {
      throw new Error('CDN metadata rootFiles missing required index.html or sw.js');
    }

    for (const fileName of filesToDownload) {
      const buf = await fetchTextFromCdnOrRaw(`${cdnBase}/${fileName}`, `${rawBase}/${fileName}`);
      fs.writeFileSync(path.join(distDir, fileName), buf);
    }

    const indexHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');
    if (!indexHtml.includes('cdn.jsdelivr.net')) {
      throw new Error('Downloaded index.html does not reference cdn.jsdelivr.net');
    }

    console.log(
      `[vercel-build] Synced ${filesToDownload.length} same-origin shell/PWA files for ${tag}. Static JS/CSS will be served from jsDelivr.`
    );
  } catch (err) {
    console.warn(
      `[vercel-build] Failed downloading verified shell files (${err?.message || err}). Falling back to local build...`
    );
    runStandardLocalBuild('shell download fallback');
  }
}

main().catch((err) => {
  console.error('[vercel-build] Unexpected error, falling back to local build:', err);
  runStandardLocalBuild('unexpected error fallback');
});
