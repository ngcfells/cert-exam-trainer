import type { PartMap } from '../../../domain/pbq';
import type { ExamItem } from '../../../exam/assemble';
import { ConfigView } from './ConfigView';
import { DiagramView } from './DiagramView';
import { MatchView } from './MatchView';
import { OrderView } from './OrderView';

export interface PbqProps {
  item: ExamItem;
  value: PartMap;
  onChange: (v: PartMap) => void;
}

const views = {
  'pbq-match': MatchView,
  'pbq-order': OrderView,
  'pbq-config': ConfigView,
  'pbq-diagram': DiagramView,
} as const;

export function PbqView(props: PbqProps) {
  const q = props.item.question;
  const View = views[q.type as keyof typeof views];
  return (
    <fieldset className="pbq">
      <legend className="stem">{q.stem}</legend>
      {View ? <View {...props} /> : <p>This question type is not supported yet.</p>}
    </fieldset>
  );
}
