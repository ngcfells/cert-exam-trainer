import { useId, useState, type ChangeEvent } from 'react';
import type { Question } from '../../domain/types';
import type { Repo } from '../../storage';
import { ImportError } from '../../storage/backup';
import { exportPack, importPack } from '../../storage/pack';
import { dateStamp, downloadJson } from '../download';
import { Loading, Table, useLoad } from '../kit';
import { questions as plural } from '../plural';
import { LoadError } from '../study/LoadError';
import { ContentNotice, NOTICE_SETTING } from './ContentNotice';
import { ellipsize, STATUS_LABELS, TYPE_LABELS } from './typeLabels';
import './author.css';

export function packFileName(exam: string, d: Date): string {
  return `cert-exam-trainer-questions-${exam}-${dateStamp(d)}.json`;
}

export function MyQuestions({
  repo,
  examCode,
  onExit,
  onEdit,
}: {
  repo: Repo;
  examCode: string;
  onExit: () => void;
  /** No id = new question. */
  onEdit: (id?: string) => void;
}) {
  const [data, refresh] = useLoad(async () => {
    const [qs, ok] = await Promise.all([repo.getUserQuestions(examCode), repo.getSetting<boolean>(NOTICE_SETTING)]);
    return { list: qs.sort((a, b) => a.stem.localeCompare(b.stem)), accepted: ok === true };
  }, [repo, examCode]);
  const [acceptedNow, setAcceptedNow] = useState(false);
  const [message, setMessage] = useState('');
  const fileId = useId();

  /** Runs an action, reporting `fail` if it throws. */
  async function attempt(action: () => Promise<string | void>, fail: string) {
    try {
      const msg = await action();
      if (msg) setMessage(msg);
    } catch (err) {
      setMessage(err instanceof ImportError ? `Import failed: ${err.message}` : fail);
    }
  }

  const remove = (q: Question) =>
    window.confirm(`Delete this question?\n\n${ellipsize(q.stem, 120)}`) &&
    void attempt(async () => {
      await repo.deleteUserQuestion(q.id);
      setMessage('Question deleted.');
      await refresh();
    }, 'Delete failed. Please try again.');

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    await attempt(async () => {
      const res = await importPack(repo, await file.text(), examCode);
      const skipped = res.skipped.length ? ` Skipped ${res.skipped.length}: ${res.skipped.map((s) => `${s.id} (${s.reason})`).join(', ')}.` : '';
      setMessage(`Imported ${plural(res.imported)}.${skipped}`);
      await refresh();
    }, 'Import failed: something went wrong reading the file.');
    input.value = '';
  }

  if (data === null) return <LoadError onExit={onExit} />;
  if (!data) return <Loading />;
  const { list } = data;
  return (
    <section className="my-questions" aria-labelledby={`${fileId}-h`}>
      <h2 id={`${fileId}-h`}>{`My questions: ${examCode}`}</h2>
      <button type="button" onClick={onExit}>
        Back to exam
      </button>
      {data.accepted || acceptedNow ? (
        <div className="author-actions">
          <button type="button" className="primary" onClick={() => onEdit()}>
            Add question
          </button>
          <label htmlFor={fileId}>Import questions (.json)</label>
          <input id={fileId} type="file" accept=".json,application/json" onChange={onFile} />
        </div>
      ) : (
        <ContentNotice
          onAccept={() => void attempt(async () => {
            await repo.setSetting(NOTICE_SETTING, true);
            setAcceptedNow(true);
          }, 'Could not save your answer. Please try again.')}
        />
      )}
      <button
        type="button"
        disabled={list.length === 0}
        onClick={() => void attempt(async () => {
          const pack = await exportPack(repo, examCode);
          downloadJson(packFileName(examCode, new Date()), pack);
          return `Exported ${plural(pack.questions.length)}.`;
        }, 'Export failed. Please try again.')}
      >
        Export my questions
      </button>
      <p aria-live="polite">{message}</p>
      {list.length === 0 ? (
        <p>You have not added any questions for this exam yet.</p>
      ) : (
        <Table
          caption={plural(list.length)}
          head={['Question', 'Type', 'Status', 'Actions']}
          rowHeader={false}
          rows={list.map((q) => [
            q.id,
            ellipsize(q.stem, 100),
            TYPE_LABELS[q.type],
            STATUS_LABELS[q.status],
            <span className="row-actions">
              <button type="button" onClick={() => onEdit(q.id)} aria-label={`Edit: ${ellipsize(q.stem, 60)}`}>
                Edit
              </button>
              <button type="button" onClick={() => void remove(q)} aria-label={`Delete: ${ellipsize(q.stem, 60)}`}>
                Delete
              </button>
            </span>,
          ])}
        />
      )}
    </section>
  );
}
