import crypto from 'node:crypto';
import { prisma } from '../db';
import { getBot } from '../bot';

// Telegram allows ~30 different-recipient messages per second. We pace at 25
// to leave headroom for rare 429 spikes.
const SEND_GAP_MS = 40;
// Don't bloat memory with thousands of error rows; keep just enough to debug.
const MAX_ERROR_SAMPLES = 10;
// Job records linger after completion so the UI can show the final report.
// Auto-purged after this long.
const JOB_RETENTION_MS = 30 * 60 * 1000;

export type SegmentName =
  | 'all_bot_started'
  | 'active_7d'
  | 'inactive_14d'
  | 'with_friends'
  | 'no_friends'
  | 'admins_only';

export interface BroadcastInput {
  text: string;
  segment: SegmentName;
  button?: { text: string; url: string };
  photoUrl?: string;
}

export interface BroadcastJob {
  id: string;
  status: 'running' | 'done' | 'cancelled' | 'failed';
  startedAt: string;
  finishedAt?: string;
  total: number;
  sent: number;
  failed: number;
  cancelRequested: boolean;
  errors: Array<{ telegramId: string; reason: string }>;
  preview: { text: string; segment: SegmentName; hasButton: boolean; hasPhoto: boolean };
}

const jobs = new Map<string, BroadcastJob>();

function purgeOld(): void {
  const cutoff = Date.now() - JOB_RETENTION_MS;
  for (const [id, j] of jobs) {
    if (j.finishedAt && new Date(j.finishedAt).getTime() < cutoff) {
      jobs.delete(id);
    }
  }
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

function adminIds(): bigint[] {
  const raw = process.env.ADMIN_TG_IDS ?? '';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /^\d+$/.test(s))
    .map((s) => BigInt(s));
}

// Counts each segment without fetching ids — used by /broadcast/segments
// to render live numbers in the form.
export async function getSegmentCounts(): Promise<Record<SegmentName, number>> {
  const [allStarted, active, inactive, withFriends] = await Promise.all([
    prisma.user.count({ where: { isBotStarted: true } }),
    prisma.user.count({
      where: { isBotStarted: true, lastSeenAt: { gt: daysAgo(7) } },
    }),
    prisma.user.count({
      where: { isBotStarted: true, lastSeenAt: { lt: daysAgo(14) } },
    }),
    prisma.user.count({
      where: {
        isBotStarted: true,
        OR: [
          { friendshipsA: { some: {} } },
          { friendshipsB: { some: {} } },
        ],
      },
    }),
  ]);
  const noFriends = allStarted - withFriends;
  return {
    all_bot_started: allStarted,
    active_7d: active,
    inactive_14d: inactive,
    with_friends: withFriends,
    no_friends: noFriends,
    admins_only: adminIds().length,
  };
}

// Returns telegram ids for the chosen segment. Always intersects with
// isBotStarted=true — without /start the bot cannot push (Telegram bans
// uninitiated outbound messages).
async function recipientsFor(segment: SegmentName): Promise<bigint[]> {
  if (segment === 'admins_only') return adminIds();

  const where: Record<string, unknown> = { isBotStarted: true };
  if (segment === 'active_7d') where.lastSeenAt = { gt: daysAgo(7) };
  if (segment === 'inactive_14d') where.lastSeenAt = { lt: daysAgo(14) };
  if (segment === 'with_friends') {
    where.OR = [{ friendshipsA: { some: {} } }, { friendshipsB: { some: {} } }];
  }
  if (segment === 'no_friends') {
    where.AND = [
      { friendshipsA: { none: {} } },
      { friendshipsB: { none: {} } },
    ];
  }
  const users = await prisma.user.findMany({ where, select: { telegramId: true } });
  return users.map((u) => u.telegramId);
}

function buildReplyMarkup(button?: { text: string; url: string }) {
  if (!button) return undefined;
  return {
    inline_keyboard: [[{ text: button.text, url: button.url }]],
  };
}

async function sendOne(
  chatId: bigint,
  input: BroadcastInput,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const bot = getBot();
  const reply_markup = buildReplyMarkup(input.button);
  try {
    if (input.photoUrl) {
      await bot.telegram.sendPhoto(Number(chatId), input.photoUrl, {
        caption: input.text,
        parse_mode: 'HTML',
        ...(reply_markup ? { reply_markup } : {}),
      });
    } else {
      await bot.telegram.sendMessage(Number(chatId), input.text, {
        parse_mode: 'HTML',
        ...(reply_markup ? { reply_markup } : {}),
      });
    }
    return { ok: true };
  } catch (err: unknown) {
    const reason =
      err instanceof Error ? err.message : typeof err === 'string' ? err : 'unknown';
    return { ok: false, reason };
  }
}

export async function startBroadcast(input: BroadcastInput): Promise<BroadcastJob> {
  purgeOld();

  const recipients = await recipientsFor(input.segment);
  const id = crypto.randomBytes(8).toString('hex');
  const job: BroadcastJob = {
    id,
    status: 'running',
    startedAt: new Date().toISOString(),
    total: recipients.length,
    sent: 0,
    failed: 0,
    cancelRequested: false,
    errors: [],
    preview: {
      text: input.text.slice(0, 200),
      segment: input.segment,
      hasButton: !!input.button,
      hasPhoto: !!input.photoUrl,
    },
  };
  jobs.set(id, job);

  // Fire-and-forget; the endpoint already returned the job to the client.
  (async () => {
    for (const chatId of recipients) {
      if (job.cancelRequested) {
        job.status = 'cancelled';
        break;
      }
      const result = await sendOne(chatId, input);
      if (result.ok) {
        job.sent++;
      } else {
        job.failed++;
        if (job.errors.length < MAX_ERROR_SAMPLES) {
          job.errors.push({ telegramId: chatId.toString(), reason: result.reason });
        }
      }
      await new Promise((r) => setTimeout(r, SEND_GAP_MS));
    }
    if (job.status === 'running') job.status = 'done';
    job.finishedAt = new Date().toISOString();
  })().catch((err) => {
    job.status = 'failed';
    job.finishedAt = new Date().toISOString();
    if (job.errors.length < MAX_ERROR_SAMPLES) {
      job.errors.push({ telegramId: 'JOB', reason: err instanceof Error ? err.message : 'unknown' });
    }
  });

  return job;
}

export function getJob(id: string): BroadcastJob | undefined {
  return jobs.get(id);
}

export function requestCancel(id: string): boolean {
  const j = jobs.get(id);
  if (!j || j.status !== 'running') return false;
  j.cancelRequested = true;
  return true;
}
