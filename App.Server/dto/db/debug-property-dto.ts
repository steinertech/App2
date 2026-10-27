import { DbDto } from './db-dto.js';

export interface DebugContentDto extends DbDto {
  /** Entered by the user in the Debug Content grid (a duplicate within the sectorKey is rejected by the database). Editable, so the grid's rowKey is the _id hex. Its properties' owners are built from it (see gridDebugPropertyOwners). */
  name?: string;
  text?: string;
}

export interface DebugPropertyDto extends DbDto {
  /** ownerName + "PropertyName/<propertyName>/" if ownerType is "CellTable", otherwise ownerName + "OwnerType/<ownerType>/PropertyName/<propertyName>/", set by the backend on insert and update (see gridDebugPropertyName). */
  name?: string;
  text?: string;
  propertyName?: string;
  propertyValue?: string;
  /** Name of the owner this property is attached to, a path ending with "/" (see gridDebugPropertyOwners). */
  ownerName?: string;
  /** Type of the owner this property is attached to. */
  ownerType?: string;
}
