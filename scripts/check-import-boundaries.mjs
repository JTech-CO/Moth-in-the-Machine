import { ESLint } from 'eslint';

const eslint = new ESLint();
const [result] = await eslint.lintText(
  "import '@/store/gameStore';\nexport const boundaryProbe = true;\n",
  { filePath: 'src/components/__boundary-probe.ts' },
);

const rejected = result.messages.some((message) => message.ruleId === 'no-restricted-imports');

if (!rejected) {
  throw new Error('Import boundary contract failed: components can import the store directly.');
}

console.log('Import boundary contract passed.');
