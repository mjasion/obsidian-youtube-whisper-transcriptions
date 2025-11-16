#!/usr/bin/env node
/**
 * Updates vendored dependencies to latest compatible versions
 * Usage:
 *   node scripts/update-vendor-deps.js               # Check all
 *   node scripts/update-vendor-deps.js youtubei.js   # Update specific
 *   node scripts/update-vendor-deps.js --check-only  # Don't update, just report
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const VENDOR_DIR = path.join(__dirname, '..', 'vendor');
const VENDORED_DEPS = [
  {
    name: 'youtubei.js',
    npmPackage: 'youtubei.js',
    files: ['package.json', 'dist/', 'LICENSE', 'README.md']
  }
];

async function checkLatestVersion(packageName) {
  try {
    const result = execSync(`npm view ${packageName} version`, { encoding: 'utf8' });
    return result.trim();
  } catch (error) {
    console.error(`Error checking latest version for ${packageName}:`, error.message);
    return null;
  }
}

async function getCurrentVendoredVersion(depName) {
  const pkgPath = path.join(VENDOR_DIR, depName, 'package.json');
  if (!fs.existsSync(pkgPath)) return null;
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  return pkg.version;
}

async function updateVendoredDep(dep, targetVersion) {
  const tmpDir = path.join(__dirname, '..', '.tmp-vendor');

  try {
    // Create temp directory
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    console.log(`Downloading ${dep.npmPackage}@${targetVersion}...`);

    // Download to temp directory
    execSync(`npm pack ${dep.npmPackage}@${targetVersion}`, { cwd: tmpDir });

    // Find the tarball
    const tarball = fs.readdirSync(tmpDir).find(f => f.endsWith('.tgz'));
    if (!tarball) {
      throw new Error('Tarball not found after npm pack');
    }

    console.log(`Extracting ${tarball}...`);

    // Extract tarball
    execSync(`tar -xzf ${tarball}`, { cwd: tmpDir });

    // Copy only needed files
    const srcDir = path.join(tmpDir, 'package');
    const destDir = path.join(VENDOR_DIR, dep.name);

    console.log(`Copying files to ${destDir}...`);

    // Remove old vendored version
    if (fs.existsSync(destDir)) {
      fs.rmSync(destDir, { recursive: true, force: true });
    }
    fs.mkdirSync(destDir, { recursive: true });

    for (const file of dep.files) {
      const src = path.join(srcDir, file);
      const dest = path.join(destDir, file);

      if (!fs.existsSync(src)) {
        console.warn(`Warning: ${file} not found in package, skipping`);
        continue;
      }

      if (file.endsWith('/')) {
        // Directory
        fs.cpSync(src, dest, { recursive: true });
      } else {
        // File
        fs.copyFileSync(src, dest);
      }
    }

    // Clean up temp directory
    fs.rmSync(tmpDir, { recursive: true, force: true });

    console.log(`✅ Updated ${dep.name} to ${targetVersion}`);

    // Git commit (optional, can be commented out for manual commits)
    try {
      const commitMsg = `chore: update vendored ${dep.name} to ${targetVersion}`;
      execSync(`git add vendor/${dep.name}`);
      execSync(`git commit -m "${commitMsg}"`);
      console.log(`✅ Committed changes`);
    } catch (error) {
      console.log(`Note: Could not auto-commit (may need manual commit):`, error.message);
    }
  } catch (error) {
    console.error(`Error updating ${dep.name}:`, error.message);
    // Clean up temp directory on error
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes('--check-only');
  const specificDep = args.find(arg => !arg.startsWith('--'));

  const depsToCheck = specificDep
    ? VENDORED_DEPS.filter(d => d.name === specificDep)
    : VENDORED_DEPS;

  if (depsToCheck.length === 0) {
    console.error(`Unknown dependency: ${specificDep}`);
    console.log('Available dependencies:', VENDORED_DEPS.map(d => d.name).join(', '));
    process.exit(1);
  }

  for (const dep of depsToCheck) {
    const current = await getCurrentVendoredVersion(dep.name);
    const latest = await checkLatestVersion(dep.npmPackage);

    if (!latest) {
      console.log(`${dep.name}: Could not check latest version`);
      continue;
    }

    console.log(`${dep.name}: ${current || 'not vendored'} -> ${latest}`);

    if (current !== latest && !checkOnly) {
      console.log(`Updating ${dep.name} to ${latest}...`);
      try {
        await updateVendoredDep(dep, latest);
      } catch (error) {
        console.error(`Failed to update ${dep.name}:`, error.message);
      }
    } else if (current === latest) {
      console.log(`✅ ${dep.name} is up to date`);
    }
  }
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
