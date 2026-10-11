export enum LayoutBandEnum {
  None = 0,
  Header = 1,
  Table = 2,
  Form = 3,
}

export interface LayoutBandDto {
  bandEnum: LayoutBandEnum;
}

export interface LayoutDto {
  name: string;
  bands: LayoutBandDto[];
}
