import { describeBankTargets, describeShippedBank } from '../shippedChecks';
import { autoOpsItems } from './items';
import { autoOpsMeta } from './meta';

// Checks on the shipped AT0-001 bank, plus the locked content targets (plan Task 4).
describeShippedBank(autoOpsMeta, autoOpsItems, {});
describeBankTargets(autoOpsMeta, autoOpsItems);
