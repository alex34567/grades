import {ClientSession, MongoClient} from 'mongodb'
import {v4 as uuidv4} from 'uuid'
import * as crypto from 'crypto'
import {promisify} from 'util'
import {NextApiRequest, NextApiResponse} from 'next'
import {ClientUser, UserType} from "../common/types";
import {IncomingMessage} from "http";
import {NextApiRequestCookies} from "next/dist/next-server/server/api-utils";
import {ClientSession as MongoSession} from 'mongodb'

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

interface WithCookies<T> {
  cookies: string[],
  data: T,
}

export async function createUser(client: MongoClient, session: MongoSession, login_name: string, name: string, password: string, type: UserType): Promise<User> {
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

  await users.insertOne(db_user, {session})

  return new User(db_user)
}

function sessionSetCookie(session: Session): string {
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
  return `${cookie_name}=${session.token.toString('base64')}; ${secure_string}${expires}HttpOnly; Path=/; SameSite=Lax`
}

function sessionDeleteCookie() {
  const production = process.env.NODE_ENV === 'production'
  let secure_string = ''
  let cookie_name = 'session'
  if (production) {
    secure_string = 'Secure; '
    cookie_name = '__Secure-session'
  }
  return `${cookie_name}=x; ${secure_string}HttpOnly; Path=/; SameSite=Lax; Expires=${new Date(0).toUTCString()}; Max-Age=0`
}

export async function logout(client: MongoClient, session: ClientSession, req: NextApiRequest) {
  const db = client.db()
  const rawClassSession = await getSession(client, session, req)
  const classSession = rawClassSession.data

  if (!classSession) {
    return []
  }

  const sessions = await db.collection<Session>('sessions')
  await sessions.deleteOne({token: classSession.token}, {session})
  if (classSession.old_session) {
    await sessions.deleteOne({token: classSession.old_session}, {session})
  }
  if (classSession.new_session) {
    await sessions.deleteOne({token: classSession.new_session}, {session})
  }

  return [sessionDeleteCookie()]
}

export async function validatePassword(dbUser: DbUser, password: string): Promise<boolean> {
  const hash = await scrypt(password, dbUser.salt, 64)
  return dbUser.password.compare(hash) === 0
}

export async function forgeSession(client: MongoClient, session: MongoSession, dbUser: DbUser): Promise<string> {
  const db = client.db()
  const sessions = db.collection<Session>('sessions')

  const new_token = await randomBytes(16)
  const csrf = await randomBytes(16)
  const new_session = {
    token: new_token,
    user_uuid: dbUser.uuid,
    persistent: false,
    expires: new Date(Date.now() + 1000 * 60 * 60 * 24),
    csrf,
  }
  await sessions.insertOne(new_session, {session})
  const ret = sessionSetCookie(new_session)

  let session_count = 0
  const session_cursor = sessions.find({user_uuid: dbUser.uuid, persistent: new_session.persistent}, {sort: {expires: -1}, batchSize: 20, session})
  try {
    let oldest_non_expired;
    // Keep the newest 20 sessions of the same persistent type
    while (session_count < 20 && (await session_cursor.hasNext())) {
      session_count++
      oldest_non_expired = (await session_cursor.next())!.expires
    }
    if (oldest_non_expired) {
      await sessions.deleteMany({user_uuid: dbUser.uuid, expires: {$lt: oldest_non_expired}, persistent: new_session.persistent}, {session})
    }
  } finally {
    await session_cursor.close()
  }

  return ret
}

export async function changePassword(client: MongoClient, session: MongoSession, dbUser: DbUser, password: string) {
  const db = client.db()
  const sessions = db.collection<Session>('sessions')
  const users = db.collection<DbUser>('users')

  await sessions.deleteMany({user_uuid: dbUser.uuid}, {session})
  const newSalt = await randomBytes(16)
  const newHash = await scrypt(password, newSalt, 64)

  await users.updateOne({uuid: dbUser.uuid}, {$set: {
    password: newHash,
    salt: newSalt
  }}, {session})
}

export async function login(client: MongoClient, session: MongoSession, req: NextApiRequest, res: NextApiResponse, user_name: string, password: string): Promise<string[] | undefined> {
  const db = client.db()
  const users = db.collection<DbUser>('users')
  const user = await users.findOne({login_name: user_name}, {session})
  if (!user) {
    return
  }

  if (!(await validatePassword(user, password))) {
    return
  }

  const cookie = await forgeSession(client, session, user)

  return [cookie]
}

async function getSession(client: MongoClient, session: ClientSession, req: IncomingMessage & { cookies: NextApiRequestCookies }): Promise<WithCookies<Session | undefined>> {
  let cookie_name = 'session'
  if (process.env.NODE_ENV === 'production') {
    cookie_name = '__Secure-session'
  }
  const cookie = req.cookies[cookie_name]
  if (!cookie) {
    return {
      cookies: [],
      data: undefined
    }
  }
  const token = Buffer.from(cookie, 'base64')
  const db = client.db()

  const sessions = db.collection<Session>('sessions')

  const classSession = await sessions.findOne({token}, {session})
  if (!classSession) {
    return {
      cookies: [sessionDeleteCookie()],
      data: undefined
    }
  }

  return {
    cookies: [],
    data: classSession
  }
}

export enum SessionError {
  NotLoggedIn,
  CSRFMissing
}

export function sessionErrorToString(error: SessionError): string {
  switch (error) {
    case SessionError.NotLoggedIn:
      return 'Not Logged In'
    case SessionError.CSRFMissing:
      return 'CSRF Missing'
  }
}

export function sessionErrorToHttpStatus(error: SessionError): number {
  switch (error) {
    case SessionError.NotLoggedIn:
      return 403
    case SessionError.CSRFMissing:
      return 400
  }
}

export async function userFromSessionNoValidate(client: MongoClient, session: ClientSession, req: IncomingMessage & { cookies: NextApiRequestCookies }): Promise<WithCookies<ClientUser | { error: SessionError }>> {
  const rawClassSession = await getSession(client, session, req)
  let cookies = rawClassSession.cookies
  const classSession = rawClassSession.data

  const db = client.db()
  const sessions = db.collection<Session>('sessions')
  const users = db.collection<DbUser>('users')

  if (!classSession) {
    return {
      cookies,
      data: {
        error: SessionError.NotLoggedIn
      }
    }
  }
  let renew_time = 1000 * 60 * 60 * 12
  let new_session_time = 1000 * 60 * 60 * 24
  if (classSession.persistent) {
    renew_time = 1000 * 60 * 60 * 24
    new_session_time = 1000 * 60 * 60 * 24 * 365
  }
  const now = Date.now();
  if (classSession.old_session) {
    await sessions.deleteOne({token: classSession.old_session}, {session})
    delete classSession.old_session
    await sessions.replaceOne({token: classSession.token}, classSession, {session})
  }
  if (classSession.expires.getTime() < now) {
    await sessions.deleteOne({token: classSession.token}, {session})
    cookies = [sessionDeleteCookie()]
    return {
      cookies,
      data: {
        error: SessionError.NotLoggedIn
      }
    }
  }
  if (classSession.expires.getTime() - now < renew_time && !classSession.new_session) {
    const new_token = await randomBytes(16)
    const csrf = await randomBytes(16)
    const new_session = {
      old_session: classSession.token,
      token: new_token,
      user_uuid: classSession.user_uuid,
      persistent: classSession.persistent,
      expires: new Date(now + new_session_time),
      csrf,
    }
    classSession.new_session = new_token
    await sessions.insertOne(new_session, {session})
    await sessions.replaceOne({token: classSession.token}, classSession, {session})
    cookies = [sessionSetCookie(new_session)]
  }
  if (classSession.new_session) {
    const new_session = await sessions.findOne({token: classSession.new_session}, {session})
    if (new_session) {
      cookies = [sessionSetCookie(new_session)]
    }
  }

  const db_user = await users.findOne({uuid: classSession.user_uuid}, {projection: {password: 0, salt: 0}, session})
  if (!db_user) {
    await sessions.deleteOne({token: classSession.token}, {session})
    return {
      cookies,
      data: {
        error: SessionError.NotLoggedIn
      }
    }
  }

  return {
    cookies,
    data: {
      name: db_user.name,
      uuid: db_user.uuid,
      type: db_user.type,
      csrf: classSession.csrf.toString('base64'),
    }
  }
}

export async function userFromSession(client: MongoClient, session: ClientSession, req: IncomingMessage & { cookies: NextApiRequestCookies }): Promise<WithCookies<ClientUser | { error: SessionError }>> {
  const rawUser = await userFromSessionNoValidate(client, session, req)
  const user = rawUser.data
  if (typeof user.error !== 'undefined') {
    return rawUser
  }
  if (req.method === 'POST' || req.method === 'PUT') {
    if (req.headers['x-grades-csrf'] !== (user as ClientUser).csrf) {
      return {
        cookies: rawUser.cookies,
        data: {
          error: SessionError.CSRFMissing
        }
      }
    }
  }
  return rawUser
}
