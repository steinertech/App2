import { DbDto } from './db-dto.js';

export type DesignMasterDetailName =
  `ContentName/${string}/BandNameMaster/${string}/FieldNameMaster/${string}/BandNameDetail/${string}/FieldNameDetail/${string}/`;

export interface DesignMasterDetailDto extends DbDto {
  /** "ContentName/<contentName>/BandNameMaster/<bandNameMaster>/FieldNameMaster/<fieldNameMaster>/BandNameDetail/<bandNameDetail>/FieldNameDetail/<fieldNameDetail>/" (see designMasterDetailName). */
  name?: DesignMasterDetailName;
  contentName?: string;
  /** References DesignBandDto.bandName of the master band. */
  bandNameMaster?: string;
  fieldNameMaster?: string;
  /** References DesignBandDto.bandName of the detail band. */
  bandNameDetail?: string;
  fieldNameDetail?: string;
  /** Only if true does the master detail take effect (see designMasterDetailBands); undefined (e.g. rows saved before it existed) counts as false. */
  isActive?: boolean;
}
