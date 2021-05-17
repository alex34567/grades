import {GetServerSidePropsContext} from "next";
import {connectToDB} from "./db";
import {htmlTransactionWithUser} from "./util";
import {UserInfo, UserType} from "../common/types";
import {withFindClassHtml} from "./class";

export async function authAdmin(context: GetServerSidePropsContext) {
  const client = await connectToDB()

  return await htmlTransactionWithUser(client, context, async (session, user) => {
    if (user.type !== UserType.admin) {
      return {
        props: {
          error: 403
        }
      }
    }
    return {
      props: {
        user
      }
    }
  })
}

export async function authClassAdmin(context: GetServerSidePropsContext) {
  const client = await connectToDB()

  return await htmlTransactionWithUser(client, context, async (session, user) => {
    return await withFindClassHtml(client, session, context.query, async (dbClass) => {
      if (user.type !== UserType.admin) {
        return {
          props: {
            error: 403
          }
        }
      }
      return {
        props: {
          user,
          classUuid: dbClass.uuid,
          className: dbClass.name
        }
      }
    })
  })
}

export async function genDropStudentView(context: GetServerSidePropsContext) {
  const client = await connectToDB()
  const db = client.db()
  const users = db.collection<UserInfo>('users')

  return await htmlTransactionWithUser(client, context, async (session, user) => {
    return await withFindClassHtml(client, session, context.query, async (dbClass) => {
      if (user.type !== UserType.admin) {
        return {
          props: {
            error: 403
          }
        }
      }

      const students = []
      for (const student of dbClass.students) {
        const studentName = (await users.findOne({uuid: student}, {session, projection: {name: 1}}))!.name
        students.push({
          name: studentName,
          uuid: student
        })
      }

      return {
        props: {
          user,
          classUuid: dbClass.uuid,
          className: dbClass.name,
          students
        }
      }
    })
  })
}

export async function userList(context: GetServerSidePropsContext) {
  const client = await connectToDB()
  const db = client.db()
  const users = db.collection<UserInfo>('users')

  return await htmlTransactionWithUser(client, context, async (session, thisUser) => {
    if (thisUser.type !== UserType.admin) {
      return {
        props: {
          error: 403
        }
      }
    }

    const userList = []
    const userCursor = users.find({}, {session, projection: {password: 0, salt: 0}})
    try {
      for await (const user of userCursor) {
        userList.push({
          login_name: user.login_name,
          uuid: user.uuid,
          name: user.name,
          type: user.type
        })
      }
    } finally {
      await userCursor.close()
    }

    return {
      props: {
        user: thisUser,
        userList,
      }
    }
  })
}