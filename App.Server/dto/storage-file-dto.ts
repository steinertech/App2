export interface StorageFileDto {
  fileName?: string;
  fileNameOnly?: string;
  isFolder?: boolean;
  /** File size in bytes (undefined for folders). */
  size?: number;
}
