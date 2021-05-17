import {connectToDB} from '../lib/server/db'
import clearCache from './clear_cache'
import {MongoClient, ClientSession as MongoSession} from 'mongodb'

export default async function initDb(client: MongoClient, session: MongoSession) {
  await clearCache(client, session)
  const db = client.db()

  const users = db.collection('users')
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
  }], {session})

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
  }], {session})

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
  }], {session})

  const grade_entry = await db.collection('grade_entry')
  await grade_entry.createIndexes([{
    key: {
      class_uuid: 1,
      student_uuid: 1,
    },
    name: 'class_student',
    unique: true,
  }, {
    key: {
      student_uuid: 1,
    },
    name: 'student'
  }, {
    key: {
      class_uuid: 1,
    },
    name: 'class'
  }], {session})
}

async function main() {
  const client = await connectToDB()
  const session = client.startSession()
  try {
    await initDb(client, session)
  } finally {
    await session.endSession()
    await client.close()
  }
}

if (require.main === module) {
  main()
}
