const DEV_FALLBACK = 'super-secret-key-for-dev-only-change-me';
const MIN_SECRET_LENGTH = 32;

export function getJwtSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET?.trim();

  if (secret && secret.length >= MIN_SECRET_LENGTH) {
    return new TextEncoder().encode(secret);
  }

  if (process.env.NODE_ENV === 'development') {
    if (!secret) {
      console.warn('JWT_SECRET is not set; using a dev-only fallback. Do not use this in production.');
    } else {
      console.warn(
        `JWT_SECRET is shorter than ${MIN_SECRET_LENGTH} characters; using a dev-only fallback.`
      );
    }
    return new TextEncoder().encode(DEV_FALLBACK);
  }

  throw new Error(
    `JWT_SECRET must be set to at least ${MIN_SECRET_LENGTH} characters in production.`
  );
}