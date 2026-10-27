import { storageUploadApi } from '../util/api/util-storage-upload.js';
import { apiHandler, jsonResponse, requestData } from '../util/core/util-main.js';
import type { StorageUploadCollectionDto } from '../dto/shared/storage-upload-dto.js';

export default apiHandler('POST', async (request) => {
  const storageUploadCollectionDto = requestData<StorageUploadCollectionDto>(request);

  const storageUploadCollection = await storageUploadApi(request, storageUploadCollectionDto);

  return jsonResponse(storageUploadCollection);
});
