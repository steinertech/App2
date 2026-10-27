import { MongoClient, type MongoClientOptions } from "mongodb";
import { attachDatabasePool } from "@vercel/functions";

const options: MongoClientOptions = {
  appName: "app",
  maxIdleTimeMS: 5000
};

/** Database of every client.db(DB_NAME) call (not taken from the MONGODB_URI path). */
export const DB_NAME = "myDatabase";

const client = new MongoClient(process.env.MONGODB_URI!, options);
attachDatabasePool(client);
// Indexes (e.g. DbDto.name unique within its sectorKey) are created by script/db-setup.ts, not on a cold start.

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
