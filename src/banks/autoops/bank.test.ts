import { primerText } from '../../domain/primer';
import { shownTopics } from '../../primer/match';
import { describeBankTargets, describeShippedBank } from '../shippedChecks';
import { autoOpsItems } from './items';
import { autoOpsMeta } from './meta';

// Checks on the shipped AT0-001 bank, plus the locked content targets (plan Task 4).
// The command primer topics shown for this bank must pass its acronym list too.
describeShippedBank(autoOpsMeta, autoOpsItems, { extraText: shownTopics(autoOpsItems).map(primerText) });
describeBankTargets(autoOpsMeta, autoOpsItems);
