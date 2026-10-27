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

/**
 * Connects the client unless it is already connected (called by apiHandler before every POST handler).
 * If a connect fails (e.g. a network error on a cold start), the driver closes the topology but keeps it, and its
 * auto connect only runs while there is no topology, so every later operation of this instance would throw
 * "Topology is closed". client.connect() replaces a topology which is not connected with a new one.
 */
export async function dbConnect() {
  await client.connect();
}

export default client;
