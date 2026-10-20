import { DbDto } from './db-dto.js';

/** Type of the owner a PropertyDto is attached to. */
export enum PropertyOwnerEnum {
  None = 0,
  DesignBand = 1,
}

export interface PropertyDto extends DbDto {
  /** Type of the owner this property is attached to. */
  ownerEnum?: PropertyOwnerEnum;
  /** Name of the owner this property is attached to. */
  ownerName?: string;
  propertyName?: string;
  propertyValue?: string;
}
