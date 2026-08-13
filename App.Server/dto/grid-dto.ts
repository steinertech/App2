export interface GridCustomDto {
  // GridCustomEnum value (see grid-cell-enum.ts). Typed as number, not
  // GridCustomEnum, because App.Web imports this file directly, App.Server
  // has no build step and isn't an ES module, and tsc can't validate a real
  // enum's runtime export syntax coming from a non-ES-module file.
  gridCustomEnum?: number;
  text?: string;
  name?: string;
}

export interface GridCellDto {
  // GridCellEnum value (see grid-cell-enum.ts). See gridCustomEnum above.
  gridCellEnum?: number;
  gridCustoms?: GridCustomDto[];
  text?: string;
}

export interface GridRowDto {
  gridCells?: GridCellDto[];
}

export interface GridAreaDto {
  text?: string;
  gridRows?: GridRowDto[];
}

export interface GridDto {
  gridName?: string;
  gridAreas?: { [gridAreaName: string]: GridAreaDto };
}
