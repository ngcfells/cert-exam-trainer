import { primerText } from '../../domain/primer';
import { shownTopics } from '../../primer/match';
import { describeBankTargets, describeShippedBank } from '../shippedChecks';
import { secAiItems } from './items';
import { secAiMeta } from './meta';

// Checks on the shipped CY0-001 bank, plus the locked content targets (plan Task 8).
// The command primer topics shown for this bank must pass its acronym list too.
describeShippedBank(secAiMeta, secAiItems, { extraText: shownTopics(secAiItems).map(primerText) });
describeBankTargets(secAiMeta, secAiItems);
