import { put } from '@vercel/blob';

export async function upload() {
  const blob = await put('my/readme.txt', 'Hello World!', { access: 'private' });
  return blob;
}
