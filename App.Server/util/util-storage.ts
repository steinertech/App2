import { put, head, issueSignedToken, presignUrl, list, createFolder, BlobNotFoundError } from '@vercel/blob';
import { sectorKey } from './util-main.js';
import { StorageFileDto } from '../dto/storage-file-dto.js';

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

/**
 * Creates path below the sector key.
 * - Folder path (ends with "/", e.g. "a/b/"): creates one folder per segment (here "a/" and "a/b/"). Throws if any of them already exists.
 * - File path (e.g. "a/b/my.txt"): creates the empty file "my.txt" in folder "a/b/". Throws if the file already exists.
 */
export async function storageNew(request: Request, path: string): Promise<void> {
  const prefix = await sectorKey(request, true);

  const segments = path.split('/').filter(Boolean);
  if (segments.length === 0) {
    throw new Error('Path is empty!');
  }

  if (!path.endsWith('/')) {
    const filePath = prefix + segments.join('/');
    if (await storageFileExists(filePath)) {
      throw new Error('File already exists!');
    }
    // Empty Buffer instead of '': put() rejects falsy bodies with "body is required".
    await put(filePath, Buffer.alloc(0), { access: 'private', addRandomSuffix: false });
    return;
  }

  // One folder marker blob (pathname with trailing slash) per level, so each folder exists on its own.
  const folderPaths = segments.map((_, index) => prefix + segments.slice(0, index + 1).join('/') + '/');

  // Check every segment before creating any, so an error doesn't leave a partially created path behind.
  // A folder exists if anything (its marker blob or any child) is stored below it.
  const existList = await Promise.all(folderPaths.map(async (folderPath) => (await list({ prefix: folderPath, limit: 1 })).blobs.length > 0));
  if (existList.some(Boolean)) {
    throw new Error('Folder already exists!');
  }

  for (const folderPath of folderPaths) {
    await createFolder(folderPath, { access: 'private' });
  }
}

async function storageFileExists(pathname: string): Promise<boolean> {
  try {
    await head(pathname);
    return true;
  } catch (error) {
    if (error instanceof BlobNotFoundError) {
      return false;
    }
    throw error;
  }
}
