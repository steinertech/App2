import { put, issueSignedToken, presignUrl } from '@vercel/blob';

export async function upload() {
  const blob = await put('my/readme.txt', 'Hello World!', { access: 'private' });
  return blob;
}

export async function download() {
  const signedToken = await issueSignedToken({
    pathname: 'my/readme.txt',
    operations: ['get'],
  });
  const { presignedUrl } = await presignUrl(signedToken, {
    operation: 'get',
    pathname: 'my/readme.txt',
    access: 'private',
  });
  return presignedUrl;
}
