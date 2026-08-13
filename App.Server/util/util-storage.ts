import { put, issueSignedToken, presignUrl, list } from '@vercel/blob';
import { sectorKey } from './util-main.ts';
import { StorageFileDto } from '../dto/storage-file-dto.ts';

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

export async function storageFiles(request: Request): Promise<StorageFileDto[]> {
  const prefix = await sectorKey(request, false);

  const blobs: { pathname: string }[] = [];
  let cursor: string | undefined;
  do {
    const result = await list({ prefix, cursor });
    blobs.push(...result.blobs);
    cursor = result.hasMore ? result.cursor : undefined;
  } while (cursor);

  const folderPaths = new Set<string>();
  const files: StorageFileDto[] = [];

  for (const blob of blobs) {
    const segments = blob.pathname.slice(prefix.length).split('/').filter(Boolean);

    for (let i = 0; i < segments.length - 1; i++) {
      folderPaths.add(prefix + segments.slice(0, i + 1).join('/'));
    }

    files.push({
      fileName: blob.pathname,
      fileNameOnly: segments[segments.length - 1] ?? blob.pathname,
      isFolder: false,
    });
  }

  const folders: StorageFileDto[] = Array.from(folderPaths).map((folderPath) => ({
    fileName: folderPath,
    fileNameOnly: folderPath.split('/').filter(Boolean).pop() ?? folderPath,
    isFolder: true,
  }));

  return [...folders, ...files];
}
