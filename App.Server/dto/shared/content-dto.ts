export enum ContentBandEnum {
  None = 0,
  Header = 1,
  Table = 2,
  Form = 3,
}

export interface ContentBandDto {
  bandEnum: ContentBandEnum;
}

export interface ContentDto {
  name: string;
  bands: ContentBandDto[];
}

/** Request of /api/content. */
export interface ContentRequestDto {
  contentName: string;
}
