import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const MAXIMUM_LCP_MS = 3_000;
const MINIMUM_ACCESSIBILITY_SCORE = 0.95;

function fail(message) {
  throw new Error(`[M9 Lighthouse gate] ${message}`);
}

function readNumber(value, label, reportPath) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    fail(`${reportPath} has no finite ${label}.`);
  }

  return value;
}

function parseArguments(arguments_) {
  let expectedUrl = null;
  const reports = [];

  for (const argument of arguments_) {
    if (argument.startsWith('--expected-url=')) {
      expectedUrl = new URL(argument.slice('--expected-url='.length)).href;
    } else if (!argument.startsWith('--')) {
      reports.push(argument);
    } else {
      fail(`unknown argument: ${argument}`);
    }
  }

  return { expectedUrl, reports };
}

const { expectedUrl, reports: reportArguments } = parseArguments(process.argv.slice(2));

if (reportArguments.length === 0) {
  fail('provide at least one Lighthouse JSON report path.');
}

const summaries = [];

for (const reportArgument of reportArguments) {
  const reportPath = path.resolve(process.cwd(), reportArgument);
  const report = JSON.parse(await readFile(reportPath, 'utf8'));

  if (report.runtimeError !== undefined) {
    fail(`${reportArgument} has runtime error ${report.runtimeError.code ?? 'UNKNOWN'}.`);
  }

  const finalUrl = new URL(report.finalUrl).href;

  if (expectedUrl !== null && finalUrl !== expectedUrl) {
    fail(`${reportArgument} final URL is ${finalUrl}; expected ${expectedUrl}.`);
  }

  if (report.audits?.['http-status-code']?.score !== 1) {
    fail(`${reportArgument} did not return a successful HTTP status.`);
  }

  const lcpMs = readNumber(
    report.audits?.['largest-contentful-paint']?.numericValue,
    'largest-contentful-paint numericValue',
    reportArgument,
  );
  const accessibilityScore = readNumber(
    report.categories?.accessibility?.score,
    'accessibility score',
    reportArgument,
  );
  const performanceScore = readNumber(
    report.categories?.performance?.score,
    'performance score',
    reportArgument,
  );

  if (lcpMs > MAXIMUM_LCP_MS) {
    fail(`${reportArgument} LCP is ${lcpMs.toFixed(0)} ms; maximum is ${MAXIMUM_LCP_MS} ms.`);
  }

  if (accessibilityScore < MINIMUM_ACCESSIBILITY_SCORE) {
    fail(
      `${reportArgument} accessibility is ${(accessibilityScore * 100).toFixed(0)}; minimum is ${MINIMUM_ACCESSIBILITY_SCORE * 100}.`,
    );
  }

  summaries.push({
    report: reportArgument,
    finalUrl,
    lcpMs: Number(lcpMs.toFixed(0)),
    performance: Number((performanceScore * 100).toFixed(0)),
    accessibility: Number((accessibilityScore * 100).toFixed(0)),
  });
}

console.log(JSON.stringify(summaries, null, 2));
