import { storageUploadUrls } from '../core/util-storage.js';
import type { StorageUploadCollectionDto } from '../../dto/shared/storage-upload-dto.js';

/** Handles the StorageUploadCollectionDto of api/storage-upload.ts: sets the presigned PUT url (storageUploadUrls) of each of its files as fileUrl and returns it. */
export async function storageUploadApi(request: Request, storageUploadCollectionDto: StorageUploadCollectionDto): Promise<StorageUploadCollectionDto> {
  const files = storageUploadCollectionDto.files ?? [];
  const fileUrls = await storageUploadUrls(request, storageUploadCollectionDto.path, files.map((file) => file.fileName ?? ''));
  files.forEach((file, index) => (file.fileUrl = fileUrls[index]));

  return storageUploadCollectionDto;
}
