import { prisma } from "@infrastructure/database";
import { generateSecureToken, hashToken } from "./tokens";

/** Reset links expire after 1 hour — long enough to fetch email, short enough to limit exposure. */
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export interface ValidPasswordResetToken {
  id: string;
  userId: string;
}

/**
 * Same principle as sessions (SECURITY.md → Password reset): only the raw
 * token is ever handed to the client (in the email link); the DB
 * (`PasswordResetToken.tokenHash`) stores exclusively its SHA-256 hash.
 */
export async function createPasswordResetToken(
  userId: string,
): Promise<{ rawToken: string; expiresAt: Date }> {
  const rawToken = generateSecureToken();
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await prisma.passwordResetToken.create({
    data: { userId, tokenHash: hashToken(rawToken), expiresAt },
  });

  return { rawToken, expiresAt };
}

/** Returns null for a token that doesn't exist, is expired, or was already used. */
export async function findValidPasswordResetToken(
  rawToken: string,
): Promise<ValidPasswordResetToken | null> {
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return null;
  }

  return { id: record.id, userId: record.userId };
}

/**
 * Atomically applies the new password hash and marks the token used, so a
 * concurrent second use of the same raw token can never both succeed
 * (ТЗ §15: single-use).
 */
export async function consumePasswordResetToken(params: {
  tokenId: string;
  userId: string;
  passwordHash: string;
}): Promise<void> {
  await prisma.$transaction([
    prisma.user.update({ where: { id: params.userId }, data: { passwordHash: params.passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: params.tokenId }, data: { usedAt: new Date() } }),
  ]);
}
