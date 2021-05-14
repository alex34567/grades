import {connectToDB} from '../lib/server/db'
import clearCache from './clear_cache'
import {MongoClient} from 'mongodb'

export default async function initDb(client: MongoClient) {
  await clearCache(client)
  const db = client.db()

  const users = await db.collection('users')
  await users.createIndexes([{
    key: {
      login_name: 1,
    },
    name: 'login_name',
    unique: true,
  }, {
    key: {
      uuid: 1,
    },
    name: 'uuid',
    unique: true,
  }])

  const sessions = await db.collection('sessions')
  await sessions.createIndexes([{
    key: {
      token: 1,
    },
    name: 'token',
    unique: true,
  }, {
    key: {
      user_uuid: 1,
    },
    name: 'user_uuid',
  }, {
    key: {
      expires: 1,
    },
    name: 'expires',
    expireAfterSeconds: 0,
  }])

  const classes = await db.collection('class')
  await classes.createIndexes([{
    key: {
      uuid: 1,
    },
    name: 'uuid',
    unique: true,
  }, {
    key: {
      professor_uuid: 1,
    },
    name: 'professor',
  }, {
    key: {
      students: 1,
    },
    name: 'students',
  }])

  const grade_entry = await db.collection('grade_entry')
  await grade_entry.createIndexes([{
    key: {
      uuid: 1,
    },
    name: 'uuid',
    unique: true,
  }, {
    key: {
      class_uuid: 1,
      student_uuid: 1,
    },
    name: 'class_student',
    unique: true,
  }])
}

async function main() {
  const client = await connectToDB()
  try {
    await initDb(client)
  } finally {
    await client.close()
  }
}

if (require.main === module) {
  main()
}
