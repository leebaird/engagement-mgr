import { rm, writeFile } from 'fs/promises';

export async function writeInitialAdminCredentials(
  path: string,
  credentials: { username: string; password: string }
): Promise<void> {
  await writeFile(
    path,
    `Username: ${credentials.username}\nTemporary password: ${credentials.password}\n`,
    { flag: 'wx', mode: 0o600 }
  );
}

export async function replaceStaleInitialAdminCredentials(
  path: string,
  credentials: { username: string; password: string }
): Promise<void> {
  await rm(path, { force: true });
  await writeInitialAdminCredentials(path, credentials);
}
