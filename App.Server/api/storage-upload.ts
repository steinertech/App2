import { storageUploadUrls } from '../util/util-storage.js';
import { apiHandler, jsonResponse, requestData } from '../util/util-main.js';
import type { StorageUploadCollectionDto } from '../dto/shared/storage-upload-dto.js';

export default apiHandler('POST', async (request) => {
  const storageUploadCollectionDto = requestData<StorageUploadCollectionDto>(request);

  const files = storageUploadCollectionDto.files ?? [];
  const fileUrls = await storageUploadUrls(request, storageUploadCollectionDto.path, files.map((file) => file.fileName ?? ''));
  files.forEach((file, index) => (file.fileUrl = fileUrls[index]));

  return jsonResponse(storageUploadCollectionDto);
});
