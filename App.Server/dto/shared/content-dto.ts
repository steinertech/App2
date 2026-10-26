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
  [ContentBandEnum.Table]: ['TableName', 'LoadSort'],
  [ContentBandEnum.Form]: ['RowCount', 'ColumnCount', 'TableName', 'LoadSort'],
};

/**
 * GridPlaneDto.planeName of the grids of a content (Content.tsx): one grid per ContentBandEnum.Table or Form band, in band order. A Table band's grid is the Data grid
 * of the "dynamic" plane with the rows of its TableName, a Form band's grid its RowCount x ColumnCount form repeated for each DynamicDto row of its TableName.
 */
export const CONTENT_VIEW_PLANE_NAME = 'contentView';

/** GridStateDto.custom key holding the band's name (ContentBandDto.name) a CONTENT_VIEW_PLANE_NAME grid is built from; missing, '' or not found is an empty grid. */
export const CONTENT_VIEW_CUSTOM_BAND_NAME = 'bandName';

export interface ContentBandDto {
  /** DesignBandDto.name ("ContentName/<contentName>/BandName/<bandName>/"); '' if missing. */
  name: string;
  bandEnum: ContentBandEnum;
  /** PropertyDto.propertyValue of each DESIGN_BAND_PROPERTY_NAMES[bandEnum], in that order ('' if missing). */
  propertyValues: string[];
}

/** propertyValue of band's property propertyName (one of DESIGN_BAND_PROPERTY_NAMES[band.bandEnum]); '' if not found. */
export function contentBandPropertyValue(band: ContentBandDto, propertyName: string): string {
  const index = (DESIGN_BAND_PROPERTY_NAMES[band.bandEnum] ?? []).indexOf(propertyName);
  return band.propertyValues[index] ?? '';
}

export interface ContentDto {
  name: string;
  bands: ContentBandDto[];
}

/** Request of /api/content. */
export interface ContentRequestDto {
  contentName: string;
}
