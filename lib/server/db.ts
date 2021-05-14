import {MongoClient} from 'mongodb';

let CLIENT_CACHE: MongoClient | undefined;

export async function connectToDB(): Promise<MongoClient> {
  if (CLIENT_CACHE) {
    return CLIENT_CACHE;
  }

  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error('Db uri not specified');
  }

  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  try {
    await client.connect();
  } catch (e) {
    await client.close();
    throw e;
  }
  CLIENT_CACHE = client;
  return client;
}
