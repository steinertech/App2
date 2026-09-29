import { put, issueSignedToken, presignUrl, list } from '@vercel/blob';
import { sectorKey } from './util-main.js';
import { StorageFileDto } from '../dto/web/storage-file-dto.js';

export async function storageUpload() {
  const blob = await put('Domain/localhost/Global/a/b/c/d/readme.txt', 'Hello World!', { access: 'private', allowOverwrite: true });
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

/** Returns one presigned PUT url per fileNames entry, for uploading into folder path (e.g. "a/b/", or "" for the root) below the sector key. Urls are valid for 5 minutes and accept files up to 1 MB. */
export async function storageUploadUrls(request: Request, path: string = '', fileNames: string[]): Promise<string[]> {
  const prefix = (await sectorKey(request, true)) + path;
  const validUntil = Date.now() + 5 * 60 * 1000;
  const maximumSizeInBytes = 1024 * 1024;

  return Promise.all(
    fileNames.map(async (fileName) => {
      const pathname = prefix + fileName;
      const signedToken = await issueSignedToken({
        pathname,
        operations: ['put'],
        validUntil,
        maximumSizeInBytes,
      });
      const { presignedUrl } = await presignUrl(signedToken, {
        operation: 'put',
        pathname,
        access: 'private',
        validUntil,
        maximumSizeInBytes,
        allowOverwrite: true,
        addRandomSuffix: false, // Keep the original file name (e.g. "A.txt" instead of "A-<random>.txt").
      });
      return presignedUrl;
    }),
  );
}

/** Lists the direct children of folder path (e.g. "a/b/", or "" for the root) below the sector key. path must end with "/" unless empty. */
export async function storageFiles(request: Request, path: string = ''): Promise<StorageFileDto[]> {
  const prefix = (await sectorKey(request, true)) + path;

  // Folded mode returns only the direct children of prefix: files in blobs, sub-folders (with trailing slash) in folders.
  const blobPaths: string[] = [];
  const folderPaths: string[] = [];
  let cursor: string | undefined;
  do {
    const result = await list({ prefix, cursor, mode: 'folded' });
    blobPaths.push(...result.blobs.map((blob) => blob.pathname));
    folderPaths.push(...result.folders);
    cursor = result.hasMore ? result.cursor : undefined;
  } while (cursor);

  const folders: StorageFileDto[] = folderPaths.map((folderPath) => ({
    fileName: folderPath,
    fileNameOnly: folderPath.split('/').filter(Boolean).pop() ?? folderPath,
    isFolder: true,
  }));

  const files: StorageFileDto[] = blobPaths
    .filter((pathname) => pathname !== prefix) // Skip the folder marker blob of prefix itself.
    .map((pathname) => ({
      fileName: pathname,
      fileNameOnly: pathname.split('/').pop() ?? pathname,
      isFolder: false,
    }));

  return [...folders, ...files];
}
