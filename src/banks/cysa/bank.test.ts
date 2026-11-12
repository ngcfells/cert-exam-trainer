import { primerText } from '../../domain/primer';
import { shownTopics } from '../../primer/match';
import { describeBankTargets, describeShippedBank } from '../shippedChecks';
import { cysaItems } from './items';
import { cysaMeta } from './meta';

// Checks on the shipped CS0-004 bank, including the locked content targets.
// The command primer topics shown for this bank must pass its acronym list too.
describeShippedBank(cysaMeta, cysaItems, { extraText: shownTopics(cysaItems).map(primerText) });
describeBankTargets(cysaMeta, cysaItems);
