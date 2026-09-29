export interface StorageUploadDto {
  fileName?: string;
  fileUrl?: string;
}

export interface StorageUploadCollectionDto {
  path?: string;
  files?: StorageUploadDto[];
}
