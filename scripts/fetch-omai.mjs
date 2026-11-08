/* Fetches the omai tarballs that package.json installs (`file:vendor/omai/<name>.tgz`), and updates the lock for a release.

   omai (github.com/njtwomey/omai) publishes omai-engine, omai-render and omai-meta as GitHub release assets, not on
   npm, so they cannot be installed by name, and the tarballs (about 20 MB) are not committed. This script reads
   omai.lock.json, puts every package it lists into vendor/omai/<name>.tgz (git-ignored), checks the sha256 against
   the lock and exits 1 on a mismatch (the bad file is deleted, never installed). A file already there with the right
   hash is left alone, so it is safe to run any time, and `npm install` / `npm ci` run it first (the `preinstall`
   script).

   omai.lock.json:
     "repo", "dir"                 the repository and the folder the tarballs go in
     "status"  (optional)          set while the lock describes a local build that is not released yet; removed by --lock
     "packages": { "<name>": { "version", "sha256", "release": { "tag", "asset" } } }
   The release is one tag per version, shared by the packages: `v<version>`, with `<name>-<version>.tgz` attached. The
   local file is always vendor/omai/<name>.tgz, whatever the asset is called, so package.json never changes. omai-meta is
   released too but nothing here uses it.

   Download order: plain HTTPS from https://github.com/<repo>/releases/download/<tag>/<asset> (the repository is
   public, so no sign-in), then, if that fails for any reason other than "not found", `gh release download` (private
   fork, rate limit, a proxy). A 404 means the release is not published yet: if vendor/omai/<name>.tgz already has the
   lock's sha256 (a local build) it is used, otherwise the script says so and how to build the tarballs.

   Bumping to a release (the one-command step):
     npm run omai:lock -- v0.1.6 && npm run omai:fetch && npm install
   `--lock <tag>` asks GitHub for the release (HTTPS API, or `gh api` if that fails), takes each listed package's
   asset and its sha256 digest (hashing the download if the API gives none), and rewrites omai.lock.json: versions, tags,
   assets, hashes; the "status" field goes. It adds nothing and removes nothing: the packages are the ones the lock lists.

   A tarball the fetch replaces (a release build after a local build of the same version) also gets its integrity in
   package-lock.json updated and its node_modules/<name> removed, because npm does not unpack a `file:` tarball again
   when the version is the same.

   After `npm install` the packages are in node_modules/<name>/. The agent guides are node_modules/omai-engine/llms.txt
   and node_modules/omai-render/llms.txt, each with an index/<domain>.md folder beside it. Read them before writing
   omai code.

   Usage: node scripts/fetch-omai.mjs            (npm run omai:fetch)
          node scripts/fetch-omai.mjs --lock <tag>   (npm run omai:lock -- <tag>) */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOCK = path.join(ROOT, "omai.lock.json");
const lock = JSON.parse(readFileSync(LOCK, "utf8"));
const dir = path.join(ROOT, lock.dir);
// the two GitHub endpoints; overridable only so the flow can be tested against a local mock
const WEB = process.env.OMAI_GITHUB_WEB ?? "https://github.com";
const API = process.env.OMAI_GITHUB_API ?? "https://api.github.com";

const sha256 = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");
class Refused extends Error {}
class NotFound extends Error {}
const fail = (msg) => {
  throw new Refused(msg);
};
const authHeaders = () => {
  const t = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  return t ? { authorization: `Bearer ${t}` } : {};
};
const BUILD_HELP =
  "Build local tarballs from an omai checkout (`make pack` there writes tarballs/omai-*-<version>.tgz) and copy them to " +
  `${lock.dir}/ as <name>.tgz (omai-engine.tgz, omai-render.tgz); a file whose sha256 equals the lock's is accepted. ` +
  "Or, once the release exists: npm run omai:lock -- <tag>.";

function gh(args) {
  try {
    return execFileSync("gh", args, { stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" });
  } catch (e) {
    if (e.code === "ENOENT") throw new Error("the GitHub CLI (gh) is not installed (https://cli.github.com)");
    throw new Error(`gh ${args.slice(0, 2).join(" ")} failed: ${String(e.stderr ?? e.message).trim()}`);
  }
}

/** Download `url` to `file` over HTTPS (redirects followed). Throws NotFound on 404, Error on any other failure. */
async function download(url, file) {
  const res = await fetch(url, { redirect: "follow", headers: authHeaders() });
  if (res.status === 404) throw new NotFound(url);
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status} for ${url}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(file));
}

/** A tarball was replaced by different bytes (a release asset after a local build, say). npm does not look again at a `file:`
    tarball whose version is unchanged, and keeps its integrity in package-lock.json, so: make the lock's integrity the new
    file's and remove the installed copy, and the next `npm install` unpacks the new one. */
function refreshNpm(name, file) {
  const lockFile = path.join(ROOT, "package-lock.json");
  if (existsSync(lockFile)) {
    const pl = JSON.parse(readFileSync(lockFile, "utf8"));
    const entry = pl.packages?.[`node_modules/${name}`];
    const integrity = `sha512-${createHash("sha512").update(readFileSync(file)).digest("base64")}`;
    if (entry && entry.integrity !== integrity) {
      entry.integrity = integrity;
      writeFileSync(lockFile, `${JSON.stringify(pl, null, 2)}\n`);
      console.log(`omai: ${name}: package-lock.json integrity updated`);
    }
  }
  const installed = path.join(ROOT, "node_modules", name);
  if (existsSync(installed)) {
    rmSync(installed, { recursive: true, force: true });
    console.log(`omai: ${name}: removed node_modules/${name} (npm install unpacks the new tarball)`);
  }
}

async function fetchAll() {
  mkdirSync(dir, { recursive: true });
  const tmp = mkdtempSync(path.join(dir, ".dl-"));
  try {
    for (const [name, p] of Object.entries(lock.packages)) {
      const dest = path.join(dir, `${name}.tgz`);
      let had;
      if (existsSync(dest)) {
        had = sha256(dest);
        if (had === p.sha256) {
          console.log(
            `omai: ${name} ${p.version} ok (${path.relative(ROOT, dest)})${lock.status ? " [local build, not yet released]" : ""}`,
          );
          continue;
        }
        rmSync(dest); // stale (an older version) or damaged: never leave it where npm would install it
      }
      if (!p.release) fail(`${name}: omai.lock.json has no "release" ({ tag, asset })`);
      const { tag, asset } = p.release;
      const got = path.join(tmp, asset);
      const url = `${WEB}/${lock.repo}/releases/download/${tag}/${asset}`;
      let how = "https";
      const unpublished = () =>
        fail(
          `${name}: release ${tag} of ${lock.repo} is not published yet (${url} is not found)` +
            (had
              ? `; the local ${path.relative(ROOT, dest)} had sha256 ${had}, the lock wants ${p.sha256}`
              : `; ${path.relative(ROOT, dest)} is missing`) +
            `.\n${BUILD_HELP}`,
        );
      try {
        await download(url, got);
      } catch (e) {
        if (e instanceof NotFound) unpublished();
        console.error(`omai: ${name}: https download failed (${e.message}); trying gh`);
        how = "gh";
        try {
          gh(["release", "download", tag, "-R", lock.repo, "-p", asset, "-D", tmp, "--clobber"]);
        } catch (e2) {
          if (/release not found|asset.*not found|no assets match/i.test(e2.message)) unpublished();
          fail(
            `${name}: could not download ${asset} from ${tag} of ${lock.repo}:\n  https: ${e.message}\n  gh: ${e2.message}`,
          );
        }
      }
      if (!existsSync(got)) fail(`${name}: ${asset} is not in what was downloaded`);
      const actual = sha256(got);
      if (actual !== p.sha256) {
        fail(
          `${name}: sha256 mismatch (lock ${p.sha256}, downloaded ${actual}). Not installed. ` +
            (lock.status
              ? `The lock still describes a local build (${lock.status}); run \`npm run omai:lock -- ${tag}\` to take the release's hashes.`
              : "Check omai.lock.json."),
        );
      }
      renameSync(got, dest);
      refreshNpm(name, dest);
      console.log(`omai: ${name} ${p.version} fetched by ${how}, sha256 verified (${path.relative(ROOT, dest)})`);
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

/** The release `tag` of the repository: HTTPS API first, `gh api` as the fallback. */
async function releaseOf(tag) {
  const api = `${API}/repos/${lock.repo}/releases/tags/${tag}`;
  try {
    const res = await fetch(api, {
      headers: { accept: "application/vnd.github+json", "user-agent": "njtwomey-fetch-omai", ...authHeaders() },
    });
    if (res.status === 404) throw new NotFound(api);
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${api}`);
    return await res.json();
  } catch (e) {
    if (e instanceof NotFound)
      fail(
        `release ${tag} of ${lock.repo} does not exist (or the repository is private and you are not signed in). Releases: https://github.com/${lock.repo}/releases`,
      );
    console.error(`omai: release lookup over https failed (${e.message}); trying gh`);
    try {
      return JSON.parse(gh(["api", `repos/${lock.repo}/releases/tags/${tag}`]));
    } catch (e2) {
      fail(`could not read release ${tag} of ${lock.repo}:\n  https: ${e.message}\n  gh: ${e2.message}`);
    }
  }
}

async function relock(tag) {
  if (!/^v\d+\.\d+\.\d+$/.test(tag ?? ""))
    fail("usage: node scripts/fetch-omai.mjs --lock v<major>.<minor>.<patch>   (for example v0.1.6)");
  const version = tag.slice(1);
  const rel = await releaseOf(tag);
  const assets = new Map((rel.assets ?? []).map((a) => [a.name, a]));
  const next = { ...lock, packages: {} };
  delete next.status;
  const tmp = mkdtempSync(path.join(tmpdir(), "omai-lock-"));
  try {
    for (const name of Object.keys(lock.packages)) {
      const asset = `${name}-${version}.tgz`;
      const a = assets.get(asset);
      if (!a) fail(`release ${tag} has no ${asset} (it has: ${[...assets.keys()].join(", ") || "no assets"})`);
      let hash = /^sha256:([0-9a-f]{64})$/.exec(a.digest ?? "")?.[1];
      let from = "the release digest";
      if (!hash) {
        const got = path.join(tmp, asset);
        await download(a.browser_download_url, got);
        hash = sha256(got);
        from = "the downloaded file";
      }
      next.packages[name] = { version, sha256: hash, release: { tag, asset } };
      console.log(`omai: ${name} ${version} ${hash} (${from})`);
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  writeFileSync(
    LOCK,
    `${JSON.stringify(next, null, 2).replace(/"release": \{\s+("tag": "[^"]+"),\s+("asset": "[^"]+")\s+\}/g, '"release": { $1, $2 }')}\n`,
  );
  console.log(`omai: omai.lock.json now describes release ${tag}. Next: npm run omai:fetch && npm install`);
}

try {
  const args = process.argv.slice(2);
  if (args[0] === "--lock") await relock(args[1]);
  else await fetchAll();
} catch (e) {
  if (!(e instanceof Refused)) console.error(`omai: unexpected failure: ${e?.cause?.message ?? e?.message ?? e}`);
  else console.error(`omai: ${e.message}`);
  process.exitCode = 1;
}
