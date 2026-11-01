import { describeBankTargets, describeShippedBank } from '../shippedChecks';
import { secAiItems } from './items';
import { secAiMeta } from './meta';

// Checks on the shipped CY0-001 bank, plus the locked content targets (plan Task 8).
describeShippedBank(secAiMeta, secAiItems, {});
describeBankTargets(secAiMeta, secAiItems);
