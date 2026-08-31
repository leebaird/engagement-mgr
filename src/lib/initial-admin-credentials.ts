import { writeFile } from 'fs/promises';

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
