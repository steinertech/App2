import { ObjectId } from 'mongodb';
import client, { DB_NAME } from './util-db.js';
import { DesignMasterDetailDto, DesignMasterDetailName } from '../dto/design-master-detail-dto.js';
import { sectorKeyProjectDb } from './util-main.js';
import { designBandName } from './util-design.js';

// Design master details are per project: sectorKeyProjectDb (like sectorKey(request, true)) also asserts the user is signed in (redirects to /sign-in otherwise).

export async function designMasterDetailLoad(request: Request): Promise<DesignMasterDetailDto[]> {
  const key = await sectorKeyProjectDb(request, 'DesignMasterDetailDto');
  const collection = client.db(DB_NAME).collection<DesignMasterDetailDto>('myCollection');
  return collection.find({ sectorKey: key, type: 'DesignMasterDetailDto' }).toArray();
}

/** ids are ObjectId hex strings (the grid's rowKeys); invalid ones are ignored. */
export async function designMasterDetailLoadByIds(request: Request, ids: string[]): Promise<DesignMasterDetailDto[]> {
  const key = await sectorKeyProjectDb(request, 'DesignMasterDetailDto');
  const collection = client.db(DB_NAME).collection<DesignMasterDetailDto>('myCollection');
  const objectIds = ids.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  return collection.find({ sectorKey: key, type: 'DesignMasterDetailDto', _id: { $in: objectIds } }).toArray();
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
  const key = await sectorKeyProjectDb(request, 'DesignMasterDetailDto');
  const collection = client.db(DB_NAME).collection<DesignMasterDetailDto>('myCollection');

  const masterDetails = designMasterDetailDtos.map((designMasterDetailDto): DesignMasterDetailDto => {
    const { _id, ...rest } = designMasterDetailDto;
    return { ...rest, name: designMasterDetailName(designMasterDetailDto), sectorKey: key, type: 'DesignMasterDetailDto' };
  });

  if (masterDetails.length > 0) {
    await collection.insertMany(masterDetails);
  }

  return masterDetails;
}

/** Updates designMasterDetailDtos by _id, setting each master detail's name by designMasterDetailName. */
export async function designMasterDetailUpdate(request: Request, designMasterDetailDtos: DesignMasterDetailDto[]): Promise<DesignMasterDetailDto[]> {
  const key = await sectorKeyProjectDb(request, 'DesignMasterDetailDto');
  const collection = client.db(DB_NAME).collection<DesignMasterDetailDto>('myCollection');

  const masterDetails = designMasterDetailDtos
    .filter((designMasterDetailDto) => designMasterDetailDto._id !== undefined)
    .map((designMasterDetailDto): DesignMasterDetailDto => ({ ...designMasterDetailDto, name: designMasterDetailName(designMasterDetailDto), sectorKey: key, type: 'DesignMasterDetailDto' }));

  if (masterDetails.length > 0) {
    await collection.bulkWrite(
      masterDetails.map(({ _id, ...masterDetail }) => ({
        updateOne: {
          filter: { _id, sectorKey: key, type: 'DesignMasterDetailDto' },
          update: { $set: masterDetail },
        },
      })),
    );
  }

  return masterDetails;
}

/** Deletes the master details by ids (ObjectId hex strings, the grid's rowKeys); invalid ids are ignored. */
export async function designMasterDetailDelete(request: Request, ids: string[]): Promise<void> {
  const key = await sectorKeyProjectDb(request, 'DesignMasterDetailDto');
  const collection = client.db(DB_NAME).collection<DesignMasterDetailDto>('myCollection');
  const objectIds = ids.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  if (objectIds.length > 0) {
    await collection.deleteMany({ sectorKey: key, type: 'DesignMasterDetailDto', _id: { $in: objectIds } });
  }
}
