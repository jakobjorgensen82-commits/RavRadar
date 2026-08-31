import fs from 'node:fs/promises';
import path from 'node:path';

function diagnosticCode(error, fallback) {
  return typeof error?.code === 'string' && error.code ? error.code : fallback;
}

export function createRequiredFileReader(root, errors) {
  if (!Array.isArray(errors)) {
    throw new TypeError('Release-gate diagnostics must be collected in an array');
  }
  const absoluteRoot = path.resolve(root);

  const readText = async relativePath => {
    try {
      return await fs.readFile(path.join(absoluteRoot, relativePath), 'utf8');
    } catch (error) {
      errors.push(`${relativePath}: kunne ikke læses (${diagnosticCode(error, 'READ_ERROR')})`);
      return '';
    }
  };

  const readJson = async (relativePath, fallback = {}) => {
    const text = await readText(relativePath);
    if (!text) return fallback;
    try {
      return JSON.parse(text);
    } catch (error) {
      errors.push(`${relativePath}: ugyldig JSON (${diagnosticCode(error, 'JSON_PARSE_ERROR')})`);
      return fallback;
    }
  };

  return Object.freeze({ readText, readJson });
}
