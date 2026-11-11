/**
 * Works out the SHA-512/256 hashes of the shipped content and compares them with the published file on the
 * Security branch. It changes nothing; `npm run deploy` is what publishes.
 *
 *   npm run hashes             print the release id, the counts and what differs from the published file
 *   npm run hashes -- --check  the same, and exit 1 when the content differs from the published release
 */
import { hashRelease } from '../src/integrity/hashes';
import { diffExams } from '../src/integrity/manifest';
import { describeChanges, readPublished, shippedHashes } from './hashes-lib';

const args = process.argv.slice(2).filter((a) => a !== '--');
const unknown = args.filter((a) => a !== '--check');
if (unknown.length) {
  console.error(`hashes: unknown option ${unknown.join(' ')}`);
  process.exit(1);
}

try {
  const local = shippedHashes(process.cwd());
  console.log(`Release id: ${hashRelease(local)}`);
  for (const [code, e] of Object.entries(local)) {
    console.log(`${code}: ${Object.keys(e.questions).length} questions, ${Object.keys(e.lessons).length} lessons, exam hash ${e.hash}`);
  }
  const published = readPublished(process.cwd(), 'origin');
  if (!published) {
    console.log('Nothing is published yet: the Security branch does not exist.');
    process.exit(args.includes('--check') ? 1 : 0);
  }
  const diffs = diffExams(local, published.current.exams);
  if (!diffs.length) {
    console.log(`This content is the published release of ${published.current.date} (commit ${published.current.commit}).`);
  } else {
    console.log(`This content differs from the published release of ${published.current.date} (commit ${published.current.commit}):`);
    for (const line of describeChanges(diffs)) console.log(line);
    if (args.includes('--check')) process.exit(1);
  }
} catch (e) {
  console.error(`hashes: ${(e as Error).message}`);
  process.exit(1);
}
