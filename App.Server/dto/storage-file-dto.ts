export interface StorageFileDto {
  /** Path relative to the sector key (e.g. "a/b/my.txt"; folders end with "/", e.g. "a/b/"). */
  fileName?: string;
  fileNameOnly?: string;
  isFolder?: boolean;
  /** File size in bytes (undefined for folders). */
  size?: number;
}
