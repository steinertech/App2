import { put, issueSignedToken, presignUrl } from '@vercel/blob';

export async function storageUpload() {
  const blob = await put('my/readme.txt', 'Hello World!', { access: 'private', allowOverwrite: true });
  return blob;
}

export async function storageDownload() {
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
