import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const expectedName = getEnv("INPUT_EXPECTED_PKG_NAME", "").trim();
const expectedVersionRaw = getEnv("INPUT_EXPECTED_PKG_VERSION", "").trim();
const workspaces = isTruthy(getEnv("INPUT_WORKSPACES", "false"));
const expectedWsVersionsRaw = getEnv("INPUT_EXPECTED_WORKSPACES_VERSIONS", "{}");
const cwd = getEnv("INPUT_CWD", ".").trim() || ".";

const abs = chdirOrDie(cwd);

readPackageJsonOrDie();

const pkgName = String(npmPkgGet("name"));
const pkgVersion = String(npmPkgGet("version"));

console.log("Detected package:");
console.log(`  cwd    : ${cwd} (${abs})`);
console.log(`  name   : ${pkgName}`);
console.log(`  version: ${pkgVersion}`);

if (expectedName) {
  if (pkgName !== expectedName) {
    die(`package.json name (${pkgName}) does not match expected name (${expectedName})`);
  }
}

if (expectedVersionRaw) {
  const expectedVersion = stripLeadingV(expectedVersionRaw);
  if (pkgVersion !== expectedVersion) {
    die(`package.json version (${pkgVersion}) does not match expected version (${expectedVersion})`);
  }
}

if (workspaces) {
  // Strong recommendation: repo root. You can relax this, but it gets ambiguous fast.
  if (cwd !== ".") {
    die(`workspaces=true requires cwd to be repo root (cwd='.') so npm can resolve the full workspace set.`);
  }

  const expected = parseExpectedMap(expectedWsVersionsRaw);
  if (Object.keys(expected).length === 0) {
    die(`workspaces=true but expected_workspaces_versions is empty ("{}"). Provide a map for all workspaces.`);
  }

  const actual = getWorkspacesFromNpmQuery();
  if (actual.length === 0) {
    die(`workspaces=true but npm reports no workspaces.`);
  }

  const actualNames = actual.map(w => w.name);
  const actualSet = new Set(actualNames);

  const missing = actualNames.filter(n => !(n in expected));
  const unknown = Object.keys(expected).filter(n => !actualSet.has(n));

  if (missing.length || unknown.length) {
    let msg = "Workspace/version map mismatch. ";
    if (missing.length) msg += `Missing entries: ${missing.join(", ")}. `;
    if (unknown.length) msg += `Unknown entries: ${unknown.join(", ")}. `;
    msg += `Actual workspaces: ${actualNames.join(", ")}.`;
    die(msg);
  }

  const mismatched = [];
  for (const w of actual) {
    const exp = expected[w.name];
    if (w.version !== exp) {
      mismatched.push(`${w.name}: expected ${exp}, found ${w.version}`);
    }
  }
  if (mismatched.length) {
    die(`Workspace package.json version mismatch: ${mismatched.join(" | ")}`);
  }

  console.log("Validated workspaces:");
  for (const name of actualNames) {
    console.log(`  - ${name}@${expected[name]}`);
  }
}

console.log("✓ Validation passed.");

function getEnv(name: string, fallback: string = "") {
  const v = process.env[name];
  return v === undefined ? fallback : v;
}

function isTruthy(s: string) {
  return String(s).toLowerCase() === "true";
}

function stripLeadingV(v: string) {
  return typeof v === "string" ? v.replace(/^v/, "") : v;
}

function error(msg: string) {
  // GitHub Actions annotation
  console.error(`::error::${msg}`);
}

function die(msg: string, code: number = 1): never {
  error(msg);
  process.exit(code);
}

function run(cmd: string) {
  return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function chdirOrDie(cwd: string) {
  const abs = path.resolve(process.cwd(), cwd);
  if (!fs.existsSync(abs)) die(`cwd path does not exist: '${cwd}' (${abs})`);
  process.chdir(abs);
  return abs;
}

function readPackageJsonOrDie() {
  const p = path.resolve("package.json");
  if (!fs.existsSync(p)) die(`No package.json found in cwd '${process.cwd()}'`);
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (e) {
    die(`Failed to parse package.json: ${e.message}`);
  }
}

function npmPkgGet(field: string) {
  try {
    // npm pkg get returns JSON (e.g. "\"name\"" or "\"1.2.3\"" for scalars)
    const out = run(`npm pkg get ${field} --json`);
    return JSON.parse(out);
  } catch (e) {
    die(`Failed to read '${field}' from package.json via npm: ${e.message}`);
  }
}

function parseExpectedMap(raw: string) {
  let obj: Record<string, string>;
  try {
    obj = JSON.parse(raw);
  } catch (e) {
    die(`expected_workspaces_versions is not valid JSON: ${e.message}`);
  }
  if (obj === null || Array.isArray(obj) || typeof obj !== "object") {
    die(`expected_workspaces_versions must be a JSON object like {"@scope/pkg":"1.2.3"}`);
  }
  for (const [k, v] of Object.entries(obj)) {
    if (typeof k !== "string" || k.length === 0) die(`Invalid workspace key in expected map: '${String(k)}'`);
    if (typeof v !== "string" || v.length === 0) die(`Invalid version for ${k}: must be a non-empty string`);
    obj[k] = stripLeadingV(v);
  }
  return obj;
}

function getWorkspacesFromNpmQuery() {
  try {
    const out = run(`npm query .workspace --json`);
    const parsed = JSON.parse(out);
    if (!Array.isArray(parsed)) return [];
    return parsed
    .map(w => ({ name: w?.name, version: w?.version }))
    .filter(w => typeof w.name === "string" && w.name.length > 0);
  } catch (e) {
    die(`Failed to query workspaces via "npm query .workspace --json": ${e.message}`);
  }
}
