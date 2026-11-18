import { AnyBulkWriteOperation, Filter, ObjectId, OptionalUnlessRequiredId, Sort } from "mongodb";
import client, { DB_NAME } from "./util-db-client.js";
import { DbDto } from "../../dto/db/db-dto.js";
import { sectorKeyDb, sectorKeyProjectDb } from "./util-sector-key.js";

/** Loads all documents of type (the DTO interface name, e.g. 'PropertyDto') in its project (sectorKeyProjectDb, default) or, if not isProject, global (sectorKeyDb) sector. */
export async function dbLoad<T extends DbDto>(request: Request, type: string, isProject = true): Promise<T[]> {
  return dbLoadByFilter<T>(request, type, {}, isProject);
}

/** Like dbLoad, only the documents matching filter (its sectorKey and type are always overwritten by the ones of dbLoad), sorted by sort if set. */
export async function dbLoadByFilter<T extends DbDto>(request: Request, type: string, filter: Filter<T>, isProject = true, sort?: Sort): Promise<T[]> {
  const key = await dbSectorKey(request, type, isProject);
  const collection = client.db(DB_NAME).collection<T>("myCollection");
  const cursor = collection.find({ ...filter, sectorKey: key, type } as Filter<T>);
  return (await (sort === undefined ? cursor : cursor.sort(sort)).toArray()) as T[];
}

/** Sector key of dbLoad (and the other db functions) for type and isProject. */
async function dbSectorKey(request: Request, type: string, isProject: boolean): Promise<string> {
  return isProject ? sectorKeyProjectDb(request, type) : sectorKeyDb(request, type);
}

/** Like dbLoad; ids are ObjectId hex strings (the grid's rowKeys); invalid ones are ignored. */
export async function dbLoadByIds<T extends DbDto>(request: Request, type: string, ids: string[], isProject = true): Promise<T[]> {
  const objectIds = ids.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  return dbLoadByFilter<T>(request, type, { _id: { $in: objectIds } } as Filter<T>, isProject);
}

/** Inserts dtos (their _id ignored, sectorKey and type set) in the sector of dbLoad. */
export async function dbInsert<T extends DbDto>(request: Request, type: string, dtos: T[], isProject = true): Promise<T[]> {
  const key = await dbSectorKey(request, type, isProject);
  const collection = client.db(DB_NAME).collection<T>("myCollection");

  const inserts = dtos.map((dto): T => {
    const { _id, ...rest } = dto;
    return { ...rest, sectorKey: key, type } as T;
  });

  if (inserts.length > 0) {
    await collection.insertMany(inserts as OptionalUnlessRequiredId<T>[]);
  }

  return inserts;
}

/** Updates dtos by _id (ones without are ignored) in the sector of dbLoad. */
export async function dbUpdate<T extends DbDto>(request: Request, type: string, dtos: T[], isProject = true): Promise<T[]> {
  const key = await dbSectorKey(request, type, isProject);
  const collection = client.db(DB_NAME).collection<T>("myCollection");

  const updates = dtos
    .filter((dto) => dto._id !== undefined)
    .map((dto): T => ({ ...dto, sectorKey: key, type }));

  if (updates.length > 0) {
    await collection.bulkWrite(
      updates.map(({ _id, ...dto }) => ({
        updateOne: {
          filter: { _id, sectorKey: key, type },
          update: { $set: dto },
        },
      })) as AnyBulkWriteOperation<T>[],
    );
  }

  return updates;
}

/** Deletes the documents by ids (ObjectId hex strings, the grid's rowKeys; invalid ones are ignored) in the sector of dbLoad. */
export async function dbDelete(request: Request, type: string, ids: string[], isProject = true): Promise<void> {
  const key = await dbSectorKey(request, type, isProject);
  const collection = client.db(DB_NAME).collection<DbDto>("myCollection");
  const objectIds = ids.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  if (objectIds.length > 0) {
    await collection.deleteMany({ sectorKey: key, type, _id: { $in: objectIds } });
  }
}
