import * as fs from 'node:fs';
import * as path from 'node:path';
import inquirer from 'inquirer';
import { glob } from 'glob';
import { migrateToVitest } from '../lib/jest-migrate.lib';

function normalizeFolder(folder: string) {
  const fullPath = path.resolve(folder);
  // remove cwd from path and leading slash
  const normalized = fullPath.replace(process.cwd(), '').substring(1);
  return normalized;
}

type IConfig = {
  testFilesPattern: string;
};

export default async function () {
  const config = await inquirer.prompt<IConfig>([
    {
      type: 'input',
      name: 'testFilesPattern',
      message: 'Your Test File pattern',
      validate(input) {
        return input === '' ? 'Please type your Test file pattern' : true;
      }
    }
  ]);

  const tsfiles = await glob(config.testFilesPattern, {
    ignore: 'node_modules/**'
  });
  for (let index = 0; index < tsfiles.length; index++) {
    const file = tsfiles[index];
    const inputFile = normalizeFolder(file);
    const code = fs.readFileSync(inputFile).toString();
    const replacedCode = migrateToVitest(code);

    fs.writeFileSync(inputFile, replacedCode);
  }

  console.log(`🟢 jest is migrated successfully `);
}
