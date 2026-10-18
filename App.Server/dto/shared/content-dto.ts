export enum ContentBandEnum {
  None = 0,
  Header = 1,
  Table = 2,
  Form = 3,
}

/** The PropertyDto.propertyName list of each ContentBandEnum. */
export const DESIGN_BAND_PROPERTY_NAMES: Record<ContentBandEnum, string[]> = {
  [ContentBandEnum.None]: [],
  [ContentBandEnum.Header]: ['Text'],
  [ContentBandEnum.Table]: ['TableName'],
  [ContentBandEnum.Form]: ['RowCount', 'ColumnCount', 'TableName'],
};

/** GridPlaneDto.planeName of a ContentBandEnum.Table band's grid: the Data grid of the "dynamic" plane as its only grid (grids[0]). */
export const CONTENT_TABLE_PLANE_NAME = 'contentTable';

/** GridStateDto.custom key holding the tableName (the band's TableName property) whose DynamicDto rows the CONTENT_TABLE_PLANE_NAME grid shows; missing or '' shows all rows. */
export const CONTENT_TABLE_CUSTOM_TABLE_NAME = 'tableName';

export interface ContentBandDto {
  bandEnum: ContentBandEnum;
  /** PropertyDto.propertyValue of each DESIGN_BAND_PROPERTY_NAMES[bandEnum], in that order ('' if missing). */
  propertyValues: string[];
}

export interface ContentDto {
  name: string;
  bands: ContentBandDto[];
}

/** Request of /api/content. */
export interface ContentRequestDto {
  contentName: string;
}
