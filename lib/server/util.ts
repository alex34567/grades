import {GetServerSidePropsContext} from "next";
import {MongoClient, ClientSession as MongoSession} from "mongodb";
import {userFromSession} from "./user";
import {ClientUser} from "../common/types";

type transactionWithUserRet<T> = T | {redirect: {destination: string, permanent: boolean}}
type htmlTransactionFunc<T> = (session: MongoSession, user: ClientUser) => Promise<T>
type htmlOnNoUserFunc<T> = (session: MongoSession) => Promise<T>

export async function htmlTransactionWithUser<T>(client: MongoClient, context: GetServerSidePropsContext, fn: htmlTransactionFunc<T>, rawOnNoUser?: htmlOnNoUserFunc<any>): Promise<transactionWithUserRet<T>> {
  let cookies
  let ret: transactionWithUserRet<T> | undefined

  let onNoUser: htmlOnNoUserFunc<T | {redirect: {destination: string, permanent: boolean}}> | undefined = rawOnNoUser

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
