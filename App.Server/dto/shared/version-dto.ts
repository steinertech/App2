/** Response of /api/version. */
export interface VersionResponseDto {
  version: string;
  domainName: string;
  text: string;
  email?: string;
  projectName?: string;
}
