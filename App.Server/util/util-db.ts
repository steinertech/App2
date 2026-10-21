import { MongoClient, MongoClientOptions } from "mongodb";
import { attachDatabasePool } from "@vercel/functions";

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
