import { useState } from 'react';
import type { PrimerTopic } from '../../domain/primer';
import { basicsTopics } from '../../primer/match';
import { topicById } from '../../primer/topics';
import { Panel } from '../panels/Panel';
import { usePanels } from '../panels/PanelProvider';
import { TopicView } from './TopicView';

function Choices({ label, topics, shown, onPick }: { label: string; topics: PrimerTopic[]; shown: string; onPick: (id: string) => void }) {
  return (
    <ul className="primer-choices" aria-label={label}>
      {topics.map((t) => (
        <li key={t.id}>
          <button type="button" aria-pressed={t.id === shown} onClick={() => onPick(t.id)}>
            {t.title}
          </button>
        </li>
      ))}
    </ul>
  );
}

/** The commands a question uses, explained over the question without leaving it. */
export function CommandHelpPanel() {
  const { helpTopics, close } = usePanels();
  const matched = helpTopics.map(topicById).filter((t): t is PrimerTopic => t !== undefined);
  const basics = basicsTopics().filter((t) => !matched.includes(t));
  const [shown, setShown] = useState(matched[0]?.id ?? basics[0]?.id ?? '');
  const topic = topicById(shown);
  return (
    <Panel kind="command-help" title="Command help" onClose={() => close()}>
      {matched.length > 1 && <Choices label="Commands in this question" topics={matched} shown={shown} onPick={setShown} />}
      {basics.length > 0 && (
        <>
          <h3>Shell basics</h3>
          <Choices label="Shell basics" topics={basics} shown={shown} onPick={setShown} />
        </>
      )}
      {topic && <TopicView key={topic.id} topic={topic} level={3} />}
    </Panel>
  );
}
