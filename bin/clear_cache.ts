import {MongoClient, ClientSession as MongoSession} from 'mongodb';

export default async function clearCache(client: MongoClient, session: MongoSession) {}
async function main() {}

if (require.main === module) {
  main()
}
