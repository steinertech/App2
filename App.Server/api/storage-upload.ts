import { storageUploadUrls } from '../util/util-storage.js';
import { corsHeaders } from '../util/util-main.js';
import { StorageUploadCollectionDto } from '../dto/shared/storage-upload-dto.js';

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    const storageUploadCollectionDto: StorageUploadCollectionDto = await request.json();

    const files = storageUploadCollectionDto.files ?? [];
    const fileUrls = await storageUploadUrls(request, storageUploadCollectionDto.path, files.map((file) => file.fileName ?? ''));
    files.forEach((file, index) => (file.fileUrl = fileUrls[index]));

    return new Response(JSON.stringify(storageUploadCollectionDto), {
      headers: { 'content-type': 'application/json', ...corsHeaders(request) },
    });
  },
};
