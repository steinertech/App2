import { DbDto } from './db-dto.js';

export interface PropertyDto extends DbDto {
  text?: string;
  propertyName?: string;
  propertyValue?: string;
  /** Name of the owner this property is attached to. */
  ownerName?: string;
  /** Type of the owner this property is attached to. */
  ownerType?: string;
}
