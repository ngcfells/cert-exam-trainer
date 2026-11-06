import { handle, type Env } from './handler';

export default {
  fetch: (req: Request, env: Env) => handle(req, env),
};
