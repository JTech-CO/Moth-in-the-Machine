import { readFile, readdir, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import process from 'node:process';

const KIB = 1024;
const BUDGETS = Object.freeze({
  initialJavaScriptBytes: 240 * KIB,
  initialJavaScriptGzipBytes: 75 * KIB,
  largestLazyJavaScriptGzipBytes: 260 * KIB,
  totalJavaScriptGzipBytes: 340 * KIB,
});

function fail(message) {
  throw new Error(`[M9 bundle budget] ${message}`);
}

function parseArguments(arguments_) {
  let distributionDirectory = 'dist';
  let expectedBase = null;

  for (const argument of arguments_) {
    if (argument.startsWith('--expected-base=')) {
      expectedBase = argument.slice('--expected-base='.length);
    } else if (!argument.startsWith('--')) {
      distributionDirectory = argument;
    } else {
      fail(`unknown argument: ${argument}`);
    }
  }

  if (expectedBase !== null && (!expectedBase.startsWith('/') || !expectedBase.endsWith('/'))) {
    fail('expected base must start and end with a slash.');
  }

  return {
    distributionDirectory: path.resolve(process.cwd(), distributionDirectory),
    expectedBase,
  };
}

function extractAttribute(markup, tagPattern, attribute) {
  const references = [];
  const expression = new RegExp(`<${tagPattern}[^>]*\\b${attribute}="([^"]+)"[^>]*>`, 'gi');

  for (const match of markup.matchAll(expression)) {
    references.push(match[1]);
  }

  return references;
}

function assetFileName(reference) {
  const marker = '/assets/';
  const markerIndex = reference.indexOf(marker);

  if (markerIndex >= 0) {
    return reference.slice(markerIndex + marker.length).split(/[?#]/u, 1)[0];
  }

  if (reference.startsWith('assets/')) {
    return reference.slice('assets/'.length).split(/[?#]/u, 1)[0];
  }

  return null;
}

async function measure(filePath) {
  const contents = await readFile(filePath);

  return {
    bytes: contents.byteLength,
    gzipBytes: gzipSync(contents, { level: 9 }).byteLength,
  };
}

function assertWithin(label, actual, maximum) {
  if (actual > maximum) {
    fail(
      `${label} is ${(actual / KIB).toFixed(2)} KiB; maximum is ${(maximum / KIB).toFixed(2)} KiB.`,
    );
  }
}

const { distributionDirectory, expectedBase } = parseArguments(process.argv.slice(2));
const indexPath = path.join(distributionDirectory, 'index.html');
const assetsDirectory = path.join(distributionDirectory, 'assets');
const indexMarkup = await readFile(indexPath, 'utf8');
const scriptReferences = extractAttribute(indexMarkup, 'script', 'src');
const modulePreloadReferences = extractAttribute(
  indexMarkup,
  'link(?=[^>]*\\brel="modulepreload")',
  'href',
);
const initialJavaScriptNames = new Set(
  [...scriptReferences, ...modulePreloadReferences]
    .map(assetFileName)
    .filter((name) => name !== null && name.endsWith('.js')),
);

if (initialJavaScriptNames.size === 0) {
  fail('dist/index.html does not reference an initial JavaScript asset.');
}

if (expectedBase !== null) {
  const localAssetReferences = [
    ...extractAttribute(indexMarkup, 'script', 'src'),
    ...extractAttribute(indexMarkup, 'link', 'href'),
  ].filter((reference) => !/^(?:https?:|data:|blob:|#)/u.test(reference));
  const invalidReferences = localAssetReferences.filter(
    (reference) => !reference.startsWith(expectedBase),
  );

  if (invalidReferences.length > 0) {
    fail(`assets outside ${expectedBase}: ${invalidReferences.join(', ')}`);
  }
}

const assetNames = await readdir(assetsDirectory);
const javaScriptNames = assetNames.filter((name) => name.endsWith('.js')).sort();
const missingInitialAssets = [...initialJavaScriptNames].filter(
  (name) => !javaScriptNames.includes(name),
);

if (missingInitialAssets.length > 0) {
  fail(`missing initial JavaScript assets: ${missingInitialAssets.join(', ')}`);
}

const measurements = new Map();
for (const name of javaScriptNames) {
  const filePath = path.join(assetsDirectory, name);
  const fileStats = await stat(filePath);

  if (!fileStats.isFile()) continue;
  measurements.set(name, await measure(filePath));
}

const initialMeasurements = [...initialJavaScriptNames].map((name) => measurements.get(name));
const initialJavaScriptBytes = initialMeasurements.reduce((total, item) => total + item.bytes, 0);
const initialJavaScriptGzipBytes = initialMeasurements.reduce(
  (total, item) => total + item.gzipBytes,
  0,
);
const lazyMeasurements = [...measurements.entries()].filter(
  ([name]) => !initialJavaScriptNames.has(name),
);
const largestLazy = lazyMeasurements.reduce(
  (largest, candidate) =>
    largest === null || candidate[1].gzipBytes > largest[1].gzipBytes ? candidate : largest,
  null,
);
const totalJavaScriptGzipBytes = [...measurements.values()].reduce(
  (total, item) => total + item.gzipBytes,
  0,
);

assertWithin('initial JavaScript', initialJavaScriptBytes, BUDGETS.initialJavaScriptBytes);
assertWithin(
  'initial JavaScript gzip',
  initialJavaScriptGzipBytes,
  BUDGETS.initialJavaScriptGzipBytes,
);
if (largestLazy !== null) {
  assertWithin(
    `largest lazy JavaScript gzip (${largestLazy[0]})`,
    largestLazy[1].gzipBytes,
    BUDGETS.largestLazyJavaScriptGzipBytes,
  );
}
assertWithin('total JavaScript gzip', totalJavaScriptGzipBytes, BUDGETS.totalJavaScriptGzipBytes);

console.log(
  JSON.stringify(
    {
      initialAssets: [...initialJavaScriptNames],
      initialJavaScriptKiB: Number((initialJavaScriptBytes / KIB).toFixed(2)),
      initialJavaScriptGzipKiB: Number((initialJavaScriptGzipBytes / KIB).toFixed(2)),
      largestLazyAsset: largestLazy?.[0] ?? null,
      largestLazyJavaScriptGzipKiB:
        largestLazy === null ? 0 : Number((largestLazy[1].gzipBytes / KIB).toFixed(2)),
      totalJavaScriptGzipKiB: Number((totalJavaScriptGzipBytes / KIB).toFixed(2)),
      expectedBase,
    },
    null,
    2,
  ),
);
