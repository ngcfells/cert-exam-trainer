import { describeShippedBank } from '../shippedChecks';
import { secAiItems } from './items';
import { secAiMeta } from './meta';

// Checks on the shipped CY0-001 bank. The targets block is added once every slice is in (plan Task 8).
describeShippedBank(secAiMeta, secAiItems, {});
