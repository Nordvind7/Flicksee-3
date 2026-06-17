import crypto from 'node:crypto';
import { prisma } from '../db';
import { config } from '../config';

interface TokenMeta {
  userAgent?: string;
  ip?: string;
}

export interface IssuedRefreshToken {
  token: string;
  expiresAt: Date;
}

export interface RotatedToken extends IssuedRefreshToken {
  userId: string;
}

// We never store the raw refresh token — only its SHA-256 hash. A leaked DB
// row therefore cannot be used to authenticate.
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function newOpaqueToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function refreshExpiry(): Date {
  return new Date(Date.now() + config.REFRESH_TOKEN_TTL_DAYS * 86_400_000);
}

export async function issueRefreshToken(
  userId: string,
  meta: TokenMeta,
): Promise<IssuedRefreshToken> {
  const token = newOpaqueToken();
  const expiresAt = refreshExpiry();
  await prisma.refreshToken.create({
    data: { userId, tokenHash: hashToken(token), expiresAt, userAgent: meta.userAgent, ip: meta.ip },
  });
  return { token, expiresAt };
}

// Validates and rotates a refresh token (revoke the old, mint a new one) in a
// single transaction. Returns null if the token is unknown, revoked, or expired.
export async function rotateRefreshToken(
  token: string,
  meta: TokenMeta,
): Promise<RotatedToken | null> {
  const existing = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
    return null;
  }

  const next = await prisma.$transaction(async (tx) => {
    await tx.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });
    const newToken = newOpaqueToken();
    const expiresAt = refreshExpiry();
    await tx.refreshToken.create({
      data: {
        userId: existing.userId,
        tokenHash: hashToken(newToken),
        expiresAt,
        userAgent: meta.userAgent,
        ip: meta.ip,
      },
    });
    return { token: newToken, expiresAt };
  });

  return { ...next, userId: existing.userId };
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
