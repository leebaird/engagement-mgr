import * as argon2 from 'argon2';

/** Reject oversized secrets before Argon2 (CPU DoS protection). */
export const MAX_PASSWORD_LENGTH = 128;
export const MIN_PASSWORD_LENGTH = 16;

export function validatePasswordComplexity(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length > MAX_PASSWORD_LENGTH) {
    errors.push(`Password must be at most ${MAX_PASSWORD_LENGTH} characters long.`);
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter.');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter.');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number.');
  }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    errors.push('Password must contain at least one symbol.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

let dummyHashPromise: Promise<string> | undefined;
const passwordVerificationCapacity = { active: 0, limit: 4 };

type VerificationCapacity = { active: number; limit: number };

export async function runPasswordVerification<T>(
  operation: () => Promise<T>,
  capacity: VerificationCapacity = passwordVerificationCapacity
): Promise<{ status: 'completed'; value: T } | { status: 'busy' }> {
  if (capacity.active >= capacity.limit) {
    return { status: 'busy' };
  }
  capacity.active += 1;
  try {
    return { status: 'completed', value: await operation() };
  } finally {
    capacity.active -= 1;
  }
}

export async function verifyPasswordHash(
  passwordHash: string,
  password: string
): Promise<'verified' | 'invalid' | 'busy'> {
  const result = await runPasswordVerification(() => argon2.verify(passwordHash, password));
  if (result.status === 'busy') return 'busy';
  return result.value ? 'verified' : 'invalid';
}

/**
 * Verify the supplied password against a throwaway hash. Used to equalize
 * login timing when the username does not exist (prevents user enumeration).
 */
export async function verifyAgainstDummyHash(password: string): Promise<'completed' | 'busy'> {
  const dummyHash = await (dummyHashPromise ??= argon2.hash(
    'dummy-password-for-timing-equalization',
    ARGON2_OPTIONS
  ));
  const result = await runPasswordVerification(() =>
    argon2.verify(dummyHash, password).catch(() => false)
  );
  return result.status;
}

const isProduction = process.env.NODE_ENV === 'production';

export const ARGON2_OPTIONS: argon2.HashOptions = isProduction
  ? {
      type: argon2.argon2id,
      memoryCost: 2 ** 16, // 64 MB – strong for production
      timeCost: 3,
    }
  : {
      type: argon2.argon2id,
      memoryCost: 2 ** 14, // 16 MB – much faster for development
      timeCost: 2,
    };
