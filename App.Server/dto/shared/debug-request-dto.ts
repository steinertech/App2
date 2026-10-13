export enum DebugRequestEnum {
  None = 0,
  Save = 1,
  Load = 2,
}

/** Request of /api/debug. Save stores text under name (insert or update), Load returns the DebugDto named name. */
export interface DebugRequestDto {
  requestEnum?: DebugRequestEnum;
  name?: string;
  text?: string;
}

/** Response of /api/debug (null if Load finds no DebugDto named name). */
export interface DebugResponseDto {
  name?: string;
  text?: string;
}
