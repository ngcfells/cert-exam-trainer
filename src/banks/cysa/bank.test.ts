import { primerText } from '../../domain/primer';
import { shownTopics } from '../../primer/match';
import { describeShippedBank } from '../shippedChecks';
import { cysaItems } from './items';
import { cysaMeta } from './meta';

// Checks on the shipped CS0-004 bank. The locked content targets (describeBankTargets) join
// once every domain is in, in the close-out task; until then the bank is partial by design.
// The command primer topics shown for this bank must pass its acronym list too.
describeShippedBank(cysaMeta, cysaItems, { extraText: shownTopics(cysaItems).map(primerText) });
