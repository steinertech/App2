import { ObjectId } from 'mongodb';
import client, { DB_NAME } from './util-db.js';
import { DesignMasterDetailDto } from '../dto/design-master-detail-dto.js';
import { sectorKeyProjectDb } from './util-main.js';

// Design master details are per project: sectorKeyProjectDb (like sectorKey(request, true)) also asserts the user is signed in (redirects to /sign-in otherwise).

export async function designMasterDetailLoad(request: Request): Promise<DesignMasterDetailDto[]> {
  const key = await sectorKeyProjectDb(request, 'DesignMasterDetailDto');
  const collection = client.db(DB_NAME).collection<DesignMasterDetailDto>('myCollection');
  return collection.find({ sectorKey: key, type: 'DesignMasterDetailDto' }).toArray();
}

/** Derives a master detail's name: contentName + "." + bandNameMaster + "." + fieldNameMaster + "." + bandNameDetail + "." + fieldNameDetail. */
export function designMasterDetailName(masterDetail: DesignMasterDetailDto): `${string}.${string}.${string}.${string}.${string}` {
  return `${masterDetail.contentName ?? ''}.${masterDetail.bandNameMaster ?? ''}.${masterDetail.fieldNameMaster ?? ''}.${masterDetail.bandNameDetail ?? ''}.${masterDetail.fieldNameDetail ?? ''}`;
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
