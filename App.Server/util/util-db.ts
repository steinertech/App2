import { AnyBulkWriteOperation, Filter, MongoClient, MongoClientOptions, ObjectId, OptionalUnlessRequiredId } from "mongodb";
import { attachDatabasePool } from "@vercel/functions";
import { DbDto } from "../dto/db/db-dto.js";
import { sectorKeyDb, sectorKeyProjectDb } from "./util-main.js";

const options: MongoClientOptions = {
  appName: "app",
  maxIdleTimeMS: 5000
};

/** Database of every client.db(DB_NAME) call (not taken from the MONGODB_URI path). */
export const DB_NAME = "myDatabase";

const client = new MongoClient(process.env.MONGODB_URI!, options);
attachDatabasePool(client);

/** DbDto.name is unique within its sectorKey (once per cold start; a no-op if the index already exists). */
client.db(DB_NAME).collection("myCollection").createIndex({ sectorKey: 1, name: 1 }, { unique: true }).catch((error) => console.error("createIndex failed!", error));

export default client;

/** Loads all documents of type (the DTO interface name, e.g. 'PropertyDto') in its project (sectorKeyProjectDb, default) or, if not isProject, global (sectorKeyDb) sector. */
export async function dbLoad<T extends DbDto>(request: Request, type: string, isProject = true): Promise<T[]> {
  const key = await dbSectorKey(request, type, isProject);
  const collection = client.db(DB_NAME).collection<T>("myCollection");
  return (await collection.find({ sectorKey: key, type } as Filter<T>).toArray()) as T[];
}

/** Sector key of dbLoad (and the other db functions) for type and isProject. */
async function dbSectorKey(request: Request, type: string, isProject: boolean): Promise<string> {
  return isProject ? sectorKeyProjectDb(request, type) : sectorKeyDb(request, type);
}

/** Like dbLoad; ids are ObjectId hex strings (the grid's rowKeys); invalid ones are ignored. */
export async function dbLoadByIds<T extends DbDto>(request: Request, type: string, ids: string[], isProject = true): Promise<T[]> {
  const key = await dbSectorKey(request, type, isProject);
  const collection = client.db(DB_NAME).collection<T>("myCollection");
  const objectIds = ids.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  return (await collection.find({ sectorKey: key, type, _id: { $in: objectIds } } as Filter<T>).toArray()) as T[];
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
