import { DbDto } from './db-dto.js';

export interface DesignMasterDetailDto extends DbDto {
  /** contentName + "." + bandNameMaster + "." + fieldNameMaster + "." + bandNameDetail + "." + fieldNameDetail (see designMasterDetailName). */
  name?: `${string}.${string}.${string}.${string}.${string}`;
  contentName?: string;
  /** References DesignBandDto.bandName of the master band. */
  bandNameMaster?: string;
  fieldNameMaster?: string;
  /** References DesignBandDto.bandName of the detail band. */
  bandNameDetail?: string;
  fieldNameDetail?: string;
}
