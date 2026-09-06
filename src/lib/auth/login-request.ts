export const MAX_LOGIN_REQUEST_BYTES = 4 * 1024;

export class LoginRequestError extends Error {}

export function isSameOriginLoginRequest(request: Request): boolean {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host') ?? new URL(request.url).host;
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function readLoginForm(request: Request): Promise<URLSearchParams> {
  if (!isSameOriginLoginRequest(request)) {
    throw new LoginRequestError('Invalid login origin');
  }
  if (
    request.headers.get('content-type')?.split(';', 1)[0]?.trim() !==
    'application/x-www-form-urlencoded'
  ) {
    throw new LoginRequestError('Invalid login content type');
  }
  const contentLength = request.headers.get('content-length');
  if (contentLength) {
    const declaredLength = Number(contentLength);
    if (!Number.isSafeInteger(declaredLength) || declaredLength < 0 || declaredLength > MAX_LOGIN_REQUEST_BYTES) {
      throw new LoginRequestError('Login request is too large');
    }
  }
  if (!request.body) throw new LoginRequestError('Login request is empty');

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > MAX_LOGIN_REQUEST_BYTES) {
      await reader.cancel();
      throw new LoginRequestError('Login request is too large');
    }
    chunks.push(value);
  }
  return new URLSearchParams(
    Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)), bytes).toString('utf8')
  );
}
