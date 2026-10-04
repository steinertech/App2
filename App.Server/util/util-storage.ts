import { put, head, issueSignedToken, presignUrl, list, createFolder, BlobNotFoundError, del, rename } from '@vercel/blob';
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
  const blobs: { pathname: string; size: number }[] = [];
  const folderPaths: string[] = [];
  let cursor: string | undefined;
  do {
    const result = await list({ prefix, cursor, mode: 'folded' });
    blobs.push(...result.blobs);
    folderPaths.push(...result.folders);
    cursor = result.hasMore ? result.cursor : undefined;
  } while (cursor);

  const folders: StorageFileDto[] = folderPaths.map((folderPath) => ({
    fileName: folderPath,
    fileNameOnly: folderPath.split('/').filter(Boolean).pop() ?? folderPath,
    isFolder: true,
  }));

  const files: StorageFileDto[] = blobs
    .filter((blob) => blob.pathname !== prefix) // Skip the folder marker blob of prefix itself.
    .map((blob) => ({
      fileName: blob.pathname,
      fileNameOnly: blob.pathname.split('/').pop() ?? blob.pathname,
      isFolder: false,
      size: blob.size,
    }));

  return [...folders, ...files];
}

/**
 * Creates fileOrFolderName in folder path (e.g. "a/b/", or "" for the root) below the sector key.
 * - Folder name (ends with "/", e.g. "Docs/" or "Docs/2024/"): creates one folder per segment (here "Docs/" and "Docs/2024/"). Throws if any of them already exists.
 * - File name (e.g. "my.txt"): creates the empty file "my.txt" in folder path. Throws if the file already exists.
 */
export async function storageNew(request: Request, path: string = '', fileOrFolderName: string): Promise<void> {
  const prefix = (await sectorKey(request, true)) + path;

  const segments = fileOrFolderName.split('/').filter(Boolean);
  if (segments.length === 0) {
    throw new Error('File or folder name is empty!');
  }

  if (!fileOrFolderName.endsWith('/')) {
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

/**
 * Deletes every fileOrFolderNames entry of folder path (e.g. "a/b/", or "" for the root) below the sector key.
 * - Folder name (ends with "/", e.g. "Docs/"): deletes the folder recursively, including its folder marker blob and everything below it.
 * - File name (e.g. "my.txt"): deletes the file.
 */
export async function storageDelete(request: Request, path: string = '', fileOrFolderNames: string[]): Promise<void> {
  const prefix = (await sectorKey(request, true)) + path;

  const pathnames: string[] = [];
  for (const fileOrFolderName of fileOrFolderNames.filter(Boolean)) {
    if (!fileOrFolderName.endsWith('/')) {
      pathnames.push(prefix + fileOrFolderName);
      continue;
    }

    // Expanded mode (no folded) lists every blob below the folder, folder marker blobs of it and its sub-folders included.
    let cursor: string | undefined;
    do {
      const result = await list({ prefix: prefix + fileOrFolderName, cursor });
      pathnames.push(...result.blobs.map((blob) => blob.pathname));
      cursor = result.hasMore ? result.cursor : undefined;
    } while (cursor);
  }

  // Delete in chunks to keep each delete request small.
  const chunkSize = 1000;
  for (let index = 0; index < pathnames.length; index += chunkSize) {
    await del(pathnames.slice(index, index + chunkSize));
  }
}

/**
 * Renames one fileOrFolderName of folder path (e.g. "a/b/", or "" for the root) below the sector key to fileOrFolderNameModified (same folder).
 * - Folder name (ends with "/", e.g. "Docs/"): renames the folder marker blob and every blob below it. A trailing "/" on fileOrFolderNameModified is optional.
 * - File name (e.g. "my.txt"): renames the file.
 * Throws if fileOrFolderNameModified is empty, contains "/", or already exists.
 */
export async function storageRename(request: Request, path: string = '', fileOrFolderName: string, fileOrFolderNameModified: string): Promise<void> {
  const prefix = (await sectorKey(request, true)) + path;

  const isFolder = fileOrFolderName.endsWith('/');
  const name = fileOrFolderName.replace(/\/$/, '');
  const nameModified = fileOrFolderNameModified.trim().replace(/\/$/, '');
  if (name === '' || name.includes('/')) {
    throw new Error('Invalid file name!');
  }
  if (nameModified === '' || nameModified.includes('/')) {
    throw new Error('Invalid new file name!');
  }
  if (nameModified === name) {
    return;
  }

  if (!isFolder) {
    if (await storageFileExists(prefix + nameModified)) {
      throw new Error('File already exists!');
    }
    await rename(prefix + name, prefix + nameModified, { access: 'private', addRandomSuffix: false });
    return;
  }

  const folderPath = `${prefix}${name}/`;
  const folderPathModified = `${prefix}${nameModified}/`;
  if ((await list({ prefix: folderPathModified, limit: 1 })).blobs.length > 0) {
    throw new Error('Folder already exists!');
  }

  // Expanded mode (no folded) lists every blob below the folder, folder marker blobs of it and its sub-folders included.
  const pathnames: string[] = [];
  let cursor: string | undefined;
  do {
    const result = await list({ prefix: folderPath, cursor });
    pathnames.push(...result.blobs.map((blob) => blob.pathname));
    cursor = result.hasMore ? result.cursor : undefined;
  } while (cursor);

  // rename() rejects pathnames ending with "/" ("Missing filename in pathname"), so folder marker blobs (of the folder and its
  // sub-folders) are recreated with createFolder() and the old ones deleted, while file blobs are renamed.
  const folderMarkerPathnames = pathnames.filter((pathname) => pathname.endsWith('/'));
  const filePathnames = pathnames.filter((pathname) => !pathname.endsWith('/'));
  const pathnameModified = (pathname: string) => folderPathModified + pathname.slice(folderPath.length);

  for (const pathname of folderMarkerPathnames) {
    await createFolder(pathnameModified(pathname), { access: 'private' });
  }

  // Rename in small parallel chunks to limit concurrent requests.
  const chunkSize = 10;
  for (let index = 0; index < filePathnames.length; index += chunkSize) {
    await Promise.all(
      filePathnames
        .slice(index, index + chunkSize)
        .map((pathname) => rename(pathname, pathnameModified(pathname), { access: 'private', addRandomSuffix: false })),
    );
  }

  if (folderMarkerPathnames.length > 0) {
    await del(folderMarkerPathnames);
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
