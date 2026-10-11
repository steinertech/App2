export enum ContentBandEnum {
  None = 0,
  Header = 1,
  Table = 2,
  Form = 3,
}

/** The DesignBandPropertyDto.propertyName list of each ContentBandEnum. */
export const DESIGN_BAND_PROPERTY_NAMES: Record<ContentBandEnum, string[]> = {
  [ContentBandEnum.None]: [],
  [ContentBandEnum.Header]: ['Text'],
  [ContentBandEnum.Table]: ['TableName'],
  [ContentBandEnum.Form]: ['RowCount', 'ColumnCount'],
};

export interface ContentBandDto {
  bandEnum: ContentBandEnum;
  /** DesignBandPropertyDto.propertyValue of each DESIGN_BAND_PROPERTY_NAMES[bandEnum], in that order ('' if missing). */
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
