import { useId, useState, type ChangeEvent } from 'react';
import type { Repo } from '../storage';
import { exportBackup, importBackup, ImportError } from '../storage/backup';
import { dateStamp, downloadJson } from './download';
import { questions } from './plural';

export function backupFileName(d: Date): string {
  return `cert-exam-trainer-backup-${dateStamp(d)}.json`;
}

export function BackupControls({ repo, onImported }: { repo: Repo; onImported: () => void }) {
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [message, setMessage] = useState('');
  const inputId = useId();

  async function onExport() {
    try {
      const file = await exportBackup(repo);
      downloadJson(backupFileName(new Date()), file);
      setMessage(`Exported ${questions(file.userQuestions.length)}.`);
    } catch {
      setMessage('Export failed. Please try again.');
    }
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    if (mode === 'replace' && !window.confirm('Replace all your questions, settings and history with this backup?')) {
      input.value = '';
      return;
    }
    try {
      const res = await importBackup(repo, await file.text(), mode);
      const skipped = res.skipped.length
        ? ` Skipped ${res.skipped.length}: ${res.skipped.map((s) => `${s.id} (${s.reason})`).join(', ')}.`
        : '';
      setMessage(`Imported ${questions(res.imported)}.${skipped}`);
      onImported();
    } catch (err) {
      setMessage(`Import failed: ${err instanceof ImportError ? err.message : 'something went wrong reading the file.'}`);
    } finally {
      input.value = '';
    }
  }

  return (
    <section aria-labelledby={`${inputId}-h`}>
      <h2 id={`${inputId}-h`}>Backup</h2>
      <button type="button" onClick={onExport}>
        Export backup
      </button>
      <fieldset>
        <legend>When importing</legend>
        <label>
          <input type="radio" name={`${inputId}-mode`} checked={mode === 'merge'} onChange={() => setMode('merge')} />
          Merge with my data
        </label>
        <label>
          <input type="radio" name={`${inputId}-mode`} checked={mode === 'replace'} onChange={() => setMode('replace')} />
          Replace my data
        </label>
        {mode === 'replace' && <p className="hint">Replace deletes all your questions, settings and history first.</p>}
      </fieldset>
      <label htmlFor={inputId}>Import backup (.json)</label>
      <input id={inputId} type="file" accept=".json" onChange={onFile} />
      <p aria-live="polite">{message}</p>
    </section>
  );
}
