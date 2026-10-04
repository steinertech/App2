import { storageUploadUrls } from '../util/util-storage.js';
import { apiHandler, jsonResponse } from '../util/util-main.js';
import { StorageUploadCollectionDto } from '../dto/shared/storage-upload-dto.js';

export default apiHandler('POST', async (request) => {
  const storageUploadCollectionDto: StorageUploadCollectionDto = await request.json();

  const files = storageUploadCollectionDto.files ?? [];
  const fileUrls = await storageUploadUrls(request, storageUploadCollectionDto.path, files.map((file) => file.fileName ?? ''));
  files.forEach((file, index) => (file.fileUrl = fileUrls[index]));

  return jsonResponse(storageUploadCollectionDto);
});
