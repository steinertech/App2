import { storageUpload } from '../util/util-storage.js';
import { apiHandler, jsonResponse, requestData } from '../util/util-main.js';
import type { StorageUploadCollectionDto } from '../dto/shared/storage-upload-dto.js';

export default apiHandler('POST', async (request) => {
  const storageUploadCollectionDto = requestData<StorageUploadCollectionDto>(request);

  const storageUploadCollection = await storageUpload(request, storageUploadCollectionDto);

  return jsonResponse(storageUploadCollection);
});
