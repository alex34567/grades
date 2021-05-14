import {MongoClient} from 'mongodb'
import {v4 as uuidv4} from 'uuid'
import * as crypto from 'crypto'
import {promisify} from 'util'
import {NextApiRequest, NextApiResponse} from 'next'
import {UserType} from "../common/types";

const randomBytes = promisify(crypto.randomBytes)
const scrypt = promisify<crypto.BinaryLike, crypto.BinaryLike, number, Buffer>(crypto.scrypt)

export interface DbUser {
  login_name: string
  name: string
  uuid: string
  salt: Buffer
  password: Buffer
  type: UserType
}

export interface LoggedInUser {
  user: User
  csrf: Buffer
}

export class User {
  login_name: string
  name: string
  uuid: string
  type: UserType

  constructor(db: DbUser) {
    this.login_name = db.login_name
    this.name = db.name
    this.uuid = db.uuid
    this.type = db.type
  }
}

export interface Session {
  old_session?: Buffer
  new_session?: Buffer
  user_uuid: string
  token: Buffer
  expires: Date
  persistent: boolean
  csrf: Buffer
}

export async function createUser(client: MongoClient, login_name: string, name: string, password: string, type: UserType): Promise<User> {
  const db = client.db()

  const users = await db.collection<DbUser>('users')

  if ((await users.find({login_name}).count()) !== 0) {
    throw new Error('User already exists')
  }

  const uuid = uuidv4()
  const salt = await randomBytes(16)
  const hash = await scrypt(password, salt, 64)
  const db_user = {
    login_name,
    name,
    uuid,
    salt,
    password: hash,
    type,
  }

  await users.insertOne(db_user)

  return new User(db_user)
}

function sessionSetCookie(session: Session, res: NextApiResponse) {
  const production = process.env.NODE_ENV === 'production'
  let secure_string = ''
  let cookie_name = 'session'
  if (production) {
    secure_string = 'Secure; '
    cookie_name = '__Secure-session'
  }
  let expires = ''
  if (session.persistent) {
    expires = `Expires=${session.expires.toUTCString()}; `
  }
  res.setHeader('Set-Cookie', [
    `${cookie_name}=${session.token.toString('base64')}; ${secure_string}${expires}HttpOnly; Path=/; SameSite=Lax`])
}

function sessionDeleteCookie(res: NextApiResponse) {
  const production = process.env.NODE_ENV === 'production'
  let secure_string = ''
  let cookie_name = 'session'
  if (production) {
    secure_string = 'Secure; '
    cookie_name = '__Secure-session'
  }
  res.setHeader('Set-Cookie', [
    `${cookie_name}=x; ${secure_string}HttpOnly; Path=/; SameSite=Lax; Expires=${new Date(0).toUTCString()}; Max-Age=0`])
}

export async function logout(client: MongoClient, req: NextApiRequest, res: NextApiResponse) {
  const db = client.db()
  const session = await getSession(client, req, res)

  if (!session) {
    return
  }

  const sessions = await db.collection<Session>('sessions')
  await sessions.deleteOne({token: session.token})
  if (session.old_session) {
    await sessions.deleteOne({token: session.old_session})
  }
  if (session.new_session) {
    await sessions.deleteOne({token: session.new_session})
  }
}

export async function login(client: MongoClient, req: NextApiRequest, res: NextApiResponse, user_name: string, password: string): Promise<boolean> {
  const db = client.db()
  const users = await db.collection<DbUser>('users')
  const user = await users.findOne({login_name: user_name}, {promoteBuffers: true})
  const sessions = await db.collection<Session>('sessions')
  if (!user) {
    return false
  }

  const hash = await scrypt(password, user.salt, 64)
  if (user.password.compare(hash) !== 0) {
    return false
  }

  const new_token = await randomBytes(16)
  const csrf = await randomBytes(16)
  const new_session = {
    token: new_token,
    user_uuid: user.uuid,
    persistent: false,
    expires: new Date(Date.now() + 1000 * 60 * 60 * 24),
    csrf,
  }
  await sessions.insertOne(new_session)
  sessionSetCookie(new_session, res)

  let session_count = 0
  const session_cursor = sessions.find({user_uuid: user.uuid, persistent: new_session.persistent}, {sort: {expires: -1}, batchSize: 20})
  try {
    let oldest_non_expired;
    // Keep the newest 20 sessions of the same persistent type
    while (session_count < 20 && (await session_cursor.hasNext())) {
      session_count++
      oldest_non_expired = (await session_cursor.next())!.expires
    }
    if (oldest_non_expired) {
      sessions.deleteMany({user_uuid: user.uuid, expires: {$lt: oldest_non_expired}, persistent: new_session.persistent})
    }
  } finally {
    await session_cursor.close()
  }

  return true
}

async function getSession(client: MongoClient, req: NextApiRequest, res: NextApiResponse): Promise<Session| undefined> {
  let cookie_name = 'session'
  if (process.env.NODE_ENV === 'production') {
    cookie_name = '__Secure-session'
  }
  const cookie = req.cookies[cookie_name]
  if (!cookie) {
    return
  }
  const token = Buffer.from(cookie, 'base64')
  const db = client.db()

  const sessions = await db.collection<Session>('sessions')

  const session = await sessions.findOne({token}, {promoteBuffers: true})
  if (!session) {
    sessionDeleteCookie(res)
    return
  }

  return session
}

export async function userFromSessionNoValidate(client: MongoClient, req: NextApiRequest, res: NextApiResponse): Promise<LoggedInUser | undefined> {
  const session = await getSession(client, req, res)

  const db = client.db()
  const sessions = await db.collection<Session>('sessions')
  const users = await db.collection<DbUser>('users')

  if (!session) {
    return
  }
  let renew_time = 1000 * 60 * 60 * 12
  let new_session_time = 1000 * 60 * 60 * 24
  if (session.persistent) {
    renew_time = 1000 * 60 * 60 * 24
    new_session_time = 1000 * 60 * 60 * 24 * 365
  }
  const now = Date.now();
  if (session.old_session) {
    await sessions.deleteOne({token: session.old_session})
    delete session.old_session
    await sessions.replaceOne({token: session.token}, session)
  }
  if (session.expires.getTime() < now) {
    await sessions.deleteOne({token: session.token})
    sessionDeleteCookie(res)
    return
  }
  if (session.expires.getTime() - now < renew_time && !session.new_session) {
    const new_token = await randomBytes(16)
    const csrf = await randomBytes(16)
    const new_session = {
      old_session: session.token,
      token: new_token,
      user_uuid: session.user_uuid,
      persistent: session.persistent,
      expires: new Date(now + new_session_time),
      csrf,
    }
    session.new_session = new_token
    await sessions.insertOne(new_session)
    await sessions.replaceOne({token: session.token}, session)
    sessionSetCookie(new_session, res)
  }
  if (session.new_session) {
    const new_session = await sessions.findOne({token: session.new_session}, {promoteBuffers: true})
    if (new_session) {
      sessionSetCookie(new_session, res)
    }
  }

  const db_user = await users.findOne({uuid: session.user_uuid})
  if (!db_user) {
    await sessions.deleteOne({token: session.token})
    return
  }

  return {
    user: new User(db_user),
    csrf: session.csrf,
  }
}
