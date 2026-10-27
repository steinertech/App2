// Creates the database indexes. Run once per database (and again whenever an index is added): pnpm run db-setup
// Idempotent: createIndex does nothing if the index already exists. Requires MONGODB_URI (e.g. node --env-file=.env script/db-setup.ts).
// Run by node directly (type stripping, no build step), so a relative import needs the .ts extension (util-db.ts itself has no relative imports).
if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI is not set!');
}
// Imported after the check, since util-db.ts creates the client on import.
const { default: client, DB_NAME } = await import('../util/util-db.ts');

try {
  const collection = client.db(DB_NAME).collection('myCollection');
  // DbDto.name is unique within its sectorKey.
  const indexName = await collection.createIndex({ sectorKey: 1, name: 1 }, { unique: true });
  console.log(`Index ${indexName} created (or already existing).`);
} finally {
  await client.close();
}
