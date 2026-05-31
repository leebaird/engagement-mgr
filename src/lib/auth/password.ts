import * as argon2 from 'argon2';

export function validatePasswordComplexity(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 16) {
    errors.push('Password must be at least 16 characters long.');
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

const isProduction = process.env.NODE_ENV === 'production';

export const ARGON2_OPTIONS: argon2.Options = isProduction
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
