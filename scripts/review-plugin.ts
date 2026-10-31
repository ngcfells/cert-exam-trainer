import path from 'node:path';
import type { Plugin } from 'vite';
import { dataPlusMeta } from '../src/banks/dataplus/meta';
import { applyReviewWrite, originAllowed } from '../src/content/reviewWrite';

/** Dev server only: POST /__review/item writes a reviewed item back to src/banks/dataplus/items/. */
export function reviewPlugin(): Plugin {
  return {
    name: 'review-write-back',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__review/item', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          return res.end('POST only');
        }
        if (!originAllowed(req.headers.origin, req.headers.host)) {
          res.statusCode = 403;
          return res.end('cross-origin request refused');
        }
        let raw = '';
        req.on('data', (chunk: Buffer) => (raw += chunk.toString()));
        req.on('end', () => {
          let result: { status: number; body: string };
          try {
            result = applyReviewWrite(JSON.parse(raw) as { question: unknown; note?: string }, {
              itemsDir: path.resolve('src/banks/dataplus/items'),
              rejectLog: path.resolve('content-drafts/rejections.jsonl'),
              meta: dataPlusMeta,
            });
          } catch (e) {
            result = { status: 500, body: String(e) };
          }
          res.statusCode = result.status;
          res.setHeader('content-type', 'text/plain');
          res.end(result.body);
        });
      });
    },
  };
}
