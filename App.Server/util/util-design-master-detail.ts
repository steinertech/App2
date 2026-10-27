import { dbDelete, dbInsert, dbLoad, dbLoadByIds, dbUpdate } from './util-db.js';
import { DesignMasterDetailDto, DesignMasterDetailName } from '../dto/db/design-master-detail-dto.js';
import { designBandName } from './util-design.js';

// Design master details are per project: sectorKeyProjectDb (the default of the db functions; like sectorKey(request, true)) also asserts the user is signed in (redirects to /sign-in otherwise).

export async function designMasterDetailLoad(request: Request): Promise<DesignMasterDetailDto[]> {
  return dbLoad<DesignMasterDetailDto>(request, 'DesignMasterDetailDto');
}

/** ids are ObjectId hex strings (the grid's rowKeys); invalid ones are ignored. */
export async function designMasterDetailLoadByIds(request: Request, ids: string[]): Promise<DesignMasterDetailDto[]> {
  return dbLoadByIds<DesignMasterDetailDto>(request, 'DesignMasterDetailDto', ids);
}

/**
 * Derives a master detail's name:
 * "ContentName/<contentName>/BandNameMaster/<bandNameMaster>/FieldNameMaster/<fieldNameMaster>/BandNameDetail/<bandNameDetail>/FieldNameDetail/<fieldNameDetail>/".
 */
export function designMasterDetailName(masterDetail: DesignMasterDetailDto): DesignMasterDetailName {
  return `ContentName/${masterDetail.contentName ?? ''}/BandNameMaster/${masterDetail.bandNameMaster ?? ''}/FieldNameMaster/${masterDetail.fieldNameMaster ?? ''}/BandNameDetail/${masterDetail.bandNameDetail ?? ''}/FieldNameDetail/${masterDetail.fieldNameDetail ?? ''}/`;
}

/** The master and detail band (DesignBandDto.name, see designBandName) and fields of a Design Master Detail (see designMasterDetailBands). */
export interface DesignMasterDetailBands {
  masterBandName: string;
  fieldNameMaster: string;
  detailBandName: string;
  fieldNameDetail: string;
}

/** Returns the master and detail band of masterDetail, or undefined if it has no effect (not isActive, or fieldNameMaster or fieldNameDetail empty). */
export function designMasterDetailBands(masterDetail: DesignMasterDetailDto): DesignMasterDetailBands | undefined {
  const { contentName, bandNameMaster, fieldNameMaster, bandNameDetail, fieldNameDetail, isActive } = masterDetail;
  if (isActive !== true || !fieldNameMaster || !fieldNameDetail) {
    return undefined;
  }
  return {
    masterBandName: designBandName({ contentName, bandName: bandNameMaster }),
    fieldNameMaster,
    detailBandName: designBandName({ contentName, bandName: bandNameDetail }),
    fieldNameDetail,
  };
}

/**
 * Returns a cycle of masterDetails (see designMasterDetailBands) as its bands (DesignBandDto.name), each the master of the next, the first band repeated at the end
 * (e.g. [A, B, A]; [A, A] for a band that is its own master), or undefined if there is none.
 */
export function designMasterDetailCycle(masterDetails: DesignMasterDetailDto[]): string[] | undefined {
  // master band → its detail bands.
  const detailBandNames = new Map<string, string[]>();
  for (const bands of masterDetails.map(designMasterDetailBands)) {
    if (bands !== undefined) {
      detailBandNames.set(bands.masterBandName, [...(detailBandNames.get(bands.masterBandName) ?? []), bands.detailBandName]);
    }
  }
  // Bands whose details (recursively) have no cycle.
  const doneBandNames = new Set<string>();
  const visit = (bandName: string, path: string[]): string[] | undefined => {
    const pathIndex = path.indexOf(bandName);
    if (pathIndex !== -1) {
      return [...path.slice(pathIndex), bandName];
    }
    if (doneBandNames.has(bandName)) {
      return undefined;
    }
    for (const detailBandName of detailBandNames.get(bandName) ?? []) {
      const cycle = visit(detailBandName, [...path, bandName]);
      if (cycle !== undefined) {
        return cycle;
      }
    }
    doneBandNames.add(bandName);
    return undefined;
  };
  for (const bandName of detailBandNames.keys()) {
    const cycle = visit(bandName, []);
    if (cycle !== undefined) {
      return cycle;
    }
  }
  return undefined;
}

/** Sets each master detail's name by designMasterDetailName. */
export async function designMasterDetailInsert(request: Request, designMasterDetailDtos: DesignMasterDetailDto[]): Promise<DesignMasterDetailDto[]> {
  return dbInsert<DesignMasterDetailDto>(
    request,
    'DesignMasterDetailDto',
    designMasterDetailDtos.map((designMasterDetailDto) => ({ ...designMasterDetailDto, name: designMasterDetailName(designMasterDetailDto) })),
  );
}

/** Updates designMasterDetailDtos by _id, setting each master detail's name by designMasterDetailName. */
export async function designMasterDetailUpdate(request: Request, designMasterDetailDtos: DesignMasterDetailDto[]): Promise<DesignMasterDetailDto[]> {
  return dbUpdate<DesignMasterDetailDto>(
    request,
    'DesignMasterDetailDto',
    designMasterDetailDtos.map((designMasterDetailDto) => ({ ...designMasterDetailDto, name: designMasterDetailName(designMasterDetailDto) })),
  );
}

/** Deletes the master details by ids (ObjectId hex strings, the grid's rowKeys); invalid ids are ignored. */
export async function designMasterDetailDelete(request: Request, ids: string[]): Promise<void> {
  return dbDelete(request, 'DesignMasterDetailDto', ids);
}
