import { readdir, readFile } from 'node:fs/promises';

import {
  validateContentCatalog,
  type ContentLevelFile,
} from '../src/infrastructure/content/catalogue-validator';

const levelsDirectory = new URL('../src/content/levels/', import.meta.url);

const fileNames = (await readdir(levelsDirectory))
  .filter((fileName) => fileName.endsWith('.json'))
  .sort((left, right) => left.localeCompare(right));

if (fileNames.length === 0) {
  throw new Error('Aucun niveau JSON embarqué trouvé dans src/content/levels.');
}

const files: ContentLevelFile[] = [];

for (const fileName of fileNames) {
  const fileUrl = new URL(fileName, levelsDirectory);

  try {
    const source = await readFile(fileUrl, 'utf8');
    const value: unknown = JSON.parse(source);
    files.push({ filePath: fileName, value });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur de lecture inconnue.';
    files.push({
      filePath: fileName,
      value: undefined,
      parseError: `JSON illisible : ${message}`,
    });
  }
}

const result = validateContentCatalog(files);

if (!result.valid) {
  for (const issue of result.issues) {
    console.error(`${issue.filePath} [${issue.kind}] ${issue.message}`);
  }
  process.exitCode = 1;
} else {
  console.log(`${String(result.levels.length)} niveau(x) embarqué(s) valide(s).`);
}
