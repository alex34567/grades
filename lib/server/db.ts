import {MongoClient} from 'mongodb';

let CLIENT_CACHE: MongoClient | undefined;

let CONNECT_LOCK: ((client: MongoClient) => void)[] | undefined

export async function connectToDB(): Promise<MongoClient> {
  if (CLIENT_CACHE) {
    return CLIENT_CACHE;
  }

  if (CONNECT_LOCK) {
    return await new Promise<MongoClient>(resolve => CONNECT_LOCK!.push(resolve))
  }

  CONNECT_LOCK = []

  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error('Db uri not specified');
  }

  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    promoteBuffers: true,
  });

  try {
    await client.connect();
  } catch (e) {
    await client.close();
    throw e;
  }
  CLIENT_CACHE = client;

  const lock = CONNECT_LOCK
  CONNECT_LOCK = undefined
  for (const fun of lock) {
    fun(client)
  }

  return client;
}
