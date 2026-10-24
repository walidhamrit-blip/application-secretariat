import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const exec = promisify(execFile);
const root = fileURLToPath(new URL('./', import.meta.url));
const venvPython = join(root, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
const python = process.env.PYTHON_PATH || (existsSync(venvPython) ? venvPython : 'python');
const script = join(root, 'scripts', 'transcribe.py');

export const localTranscriber = {
  async status() {
    try {
      const { stdout } = await exec(python, [script, '--check'], { timeout: 20000, maxBuffer: 1024 * 1024, windowsHide: true });
      return JSON.parse(stdout.trim());
    } catch { return { installed: false, downloaded: false }; }
  },
  async transcribe(buffer, extension) {
    const directory = await mkdtemp(join(tmpdir(), 'secretariat-audio-'));
    const filename = join(directory, `message.${extension}`);
    try {
      await writeFile(filename, buffer, { mode: 0o600 });
      const { stdout } = await exec(python, [script, filename], { timeout: 300000, maxBuffer: 1024 * 1024, windowsHide: true });
      const result = JSON.parse(stdout.trim());
      if (result.error) throw new Error(result.error);
      return result.text;
    } catch (error) {
      if (error.killed) throw new Error('La transcription locale a dépassé 5 minutes. Essayez un vocal plus court.');
      throw new Error('Transcription locale indisponible. Lancez installer-local.bat et téléchargez le modèle Whisper avant utilisation. Vérifiez aussi que le fichier audio est lisible.');
    } finally { await rm(directory, { recursive: true, force: true }); }
  }
};
