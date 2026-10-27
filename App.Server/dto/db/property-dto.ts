import { DbDto } from './db-dto.js';

/** Type of the owner a PropertyDto is attached to. */
export enum PropertyOwnerEnum {
  None = 0,
  DesignBand = 1,
  DesignFormCell = 2,
}

export interface PropertyDto extends DbDto {
  /** ownerName + "OwnerEnum/<ownerEnum name, e.g. DesignBand>/PropertyName/<propertyName>/", set by the backend on insert and update (see propertyDtoName). */
  name?: string;
  /** Type of the owner this property is attached to. */
  ownerEnum?: PropertyOwnerEnum;
  /** Name of the owner this property is attached to, a path ending with "/" (e.g. DesignBandDto.name, see designBandPropertyOwner). */
  ownerName?: string;
  propertyName?: string;
  propertyValue?: string;
}
