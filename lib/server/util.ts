import {GetServerSidePropsContext, NextApiRequest, NextApiResponse} from "next";
import {MongoClient, ClientSession as MongoSession} from "mongodb";
import {userFromSession} from "./user";
import {ClientUser} from "../common/types";

type TransactionWithUserRet<T> = T | {redirect: {destination: string, permanent: boolean}}
type HtmlTransactionFunc<T> = (session: MongoSession, user: ClientUser) => Promise<T>
type HtmlOnNoUserFunc<T> = (session: MongoSession) => Promise<T>

export interface JsonTransactionRet<T> {
  statusCode: number,
  body: T | {status: string}
}

type JsonTransactionFunc<T> = (session: MongoSession, user: ClientUser) => Promise<JsonTransactionRet<T>>

export async function htmlTransactionWithUser<T>(client: MongoClient, context: GetServerSidePropsContext, fn: HtmlTransactionFunc<T>, rawOnNoUser?: HtmlOnNoUserFunc<any>): Promise<TransactionWithUserRet<T>> {
  let cookies
  let ret: TransactionWithUserRet<T> | undefined

  let onNoUser: HtmlOnNoUserFunc<T | {redirect: {destination: string, permanent: boolean}}> | undefined = rawOnNoUser

  if (!onNoUser) {
    onNoUser = async () => {return {redirect: {destination: `/login?redirect=${encodeURIComponent(context.req.url!)}`, permanent: false}}}
  }

  let session = client.startSession()
  try {
    await session.withTransaction(async () => {
      let rawThisUser = await userFromSession(client, session, context.req)
      cookies = rawThisUser.cookies
      if (typeof rawThisUser.data.error !== 'undefined') {
        ret = await onNoUser!(session)
        return
      }

      ret = await fn(session, rawThisUser.data as ClientUser)
    })
  } finally {
    await session.endSession()
  }

  if (cookies) {
    context.res.setHeader('Set-Cookie', cookies)
  }

  if ((ret as any).props?.error) {
    context.res.statusCode = (ret as any).props.error
  }

  return ret!
}

export async function jsonTransactionWithUser<GET, POST>(client: MongoClient, req: NextApiRequest, res: NextApiResponse, get?: JsonTransactionFunc<GET>, post?: JsonTransactionFunc<POST>) {
  let cookies: string[] | undefined
  let ret: JsonTransactionRet<GET> | JsonTransactionRet<POST> | undefined

  let allowedMethods = []
  if (get) {
    allowedMethods.push('GET', 'HEAD')
  }
  if (post) {
    allowedMethods.push('POST')
  }

  if (!allowedMethods.includes(req.method!)) {
    res.status(405)
    res.setHeader('Allow', allowedMethods.join(', '))
    res.json({
      status: 'Invalid Method'
    })
    return
  }

  if (req.method === 'POST' && (req.headers?.["content-type"] !== 'application/json' || typeof req.body !== 'object')) {
    res.status(400)
    res.json({
      status: 'Only json body/arrays can be sent'
    })
  }

  let session = client.startSession()
  try {
     await session.withTransaction(async () => {
       let rawThisUser = await userFromSession(client, session, req)
       cookies = rawThisUser.cookies
       if (typeof rawThisUser.data.error !== 'undefined') {
         ret = {
           statusCode: 403,
           body: {status: 'Not authenticated'}
         }
         return
       }

       if (req.method === 'GET' || req.method === 'HEAD') {
         ret = await get!(session, rawThisUser.data as ClientUser)
       }
       if (req.method === 'POST') {
         ret = await post!(session, rawThisUser.data as ClientUser)
       }
    })
  } finally {
    await session.endSession()
  }

  ret = ret!

  res.setHeader('Set-Cookie', cookies!)
  res.status(ret.statusCode)
  res.json(ret.body)
}
