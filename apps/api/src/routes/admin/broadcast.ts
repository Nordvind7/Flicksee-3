import type { FastifyInstance } from 'fastify';
import {
  startBroadcast,
  getJob,
  getSegmentCounts,
  requestCancel,
  type BroadcastInput,
  type SegmentName,
} from '../../lib/broadcastJob';

const VALID_SEGMENTS: SegmentName[] = [
  'all_bot_started',
  'active_7d',
  'inactive_14d',
  'with_friends',
  'no_friends',
  'admins_only',
];

export default async function broadcastRoute(app: FastifyInstance) {
  // Counts per segment — used by the form to render live numbers and to
  // confirm the impact ("you're about to message 178 users").
  app.get('/broadcast/segments', async () => {
    const counts = await getSegmentCounts();
    return { counts };
  });

  // Start a new broadcast. Returns the freshly-created job immediately;
  // delivery continues in the background.
  app.post('/broadcast', async (req, reply) => {
    const body = (req.body ?? {}) as Partial<BroadcastInput>;

    if (!body.text || typeof body.text !== 'string' || body.text.trim().length === 0) {
      return reply.status(400).send({ error: 'text is required' });
    }
    if (body.text.length > 4000) {
      return reply.status(400).send({ error: 'text too long (max 4000 chars)' });
    }
    if (!body.segment || !VALID_SEGMENTS.includes(body.segment)) {
      return reply.status(400).send({ error: 'invalid segment' });
    }
    if (body.button) {
      if (
        typeof body.button.text !== 'string' ||
        typeof body.button.url !== 'string' ||
        !body.button.text.trim() ||
        !/^https?:\/\//.test(body.button.url)
      ) {
        return reply.status(400).send({ error: 'invalid button (text + http(s) url required)' });
      }
    }
    if (body.photoUrl && !/^https?:\/\//.test(body.photoUrl)) {
      return reply.status(400).send({ error: 'photoUrl must be http(s)' });
    }

    const job = await startBroadcast({
      text: body.text,
      segment: body.segment,
      button: body.button,
      photoUrl: body.photoUrl,
    });
    return { job };
  });

  // Polling endpoint for the UI progress bar.
  app.get<{ Params: { id: string } }>('/broadcast/:id', async (req, reply) => {
    const job = getJob(req.params.id);
    if (!job) return reply.status(404).send({ error: 'job not found' });
    return { job };
  });

  // Best-effort cancel — flips a flag that the sender loop checks between
  // messages. Won't abort an in-flight Telegram API call.
  app.post<{ Params: { id: string } }>('/broadcast/:id/cancel', async (req, reply) => {
    const ok = requestCancel(req.params.id);
    if (!ok) return reply.status(409).send({ error: 'job not cancellable' });
    return { ok: true };
  });
}
