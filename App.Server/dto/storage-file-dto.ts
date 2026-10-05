export interface StorageFileDto {
  /** Path relative to the sector key (e.g. "a/b/my.txt"; folders end with "/", e.g. "a/b/"). */
  fileName?: string;
  fileNameOnly?: string;
  isFolder?: boolean;
  /** File size in bytes (undefined for folders). */
  size?: number;
  /** Upload time of the blob as ISO 8601 string (undefined for folders). A blob can't be changed in place, so this is also its last modified time. */
  dateModified?: string;
}
