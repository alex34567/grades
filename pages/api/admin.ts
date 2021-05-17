import {NextApiRequest, NextApiResponse} from "next";
import {LoginResponse} from "./login";
import {jsonTransactionWithUser} from "../../lib/server/util";
import {connectToDB} from "../../lib/server/db";
import {USER_TYPES, UserType} from "../../lib/common/types";
import {changePassword, createUser, DbUser, deleteUser, withFindUserJson} from "../../lib/server/user";
import {addStudent, createClass, deleteClass, dropStudent, withFindClassJson} from "../../lib/server/class";

export default async function handler(req: NextApiRequest, res: NextApiResponse<LoginResponse>) {
  const client = await connectToDB()

  await jsonTransactionWithUser(client, req, res, undefined, async (session, user) => {
    const db = client.db()
    const users = db.collection<DbUser>('users')

    if (user.type !== UserType.admin) {
      return {
        statusCode: 403,
        body: {
          status: 'Not an admin'
        }
      }
    }

    switch (req.body.command) {
      case 'new_user':
        let type: UserType
        if (USER_TYPES.includes(req.body.type)) {
          type = req.body.type
        } else {
          return {
            statusCode: 400,
            body: {
              status: 'Bad user type'
            }
          }
        }

        let fullName: string
        if (typeof req.body.fullName === 'string') {
          fullName = req.body.fullName
        } else {
          return {
            statusCode: 400,
            body: {
              status: 'Bad full name'
            }
          }
        }

        let loginName: string
        if (typeof req.body.loginName === 'string') {
          loginName = req.body.loginName
        } else {
          return {
            statusCode: 400,
            body: {
              status: 'Bad login name'
            }
          }
        }

        let password: string
        if (typeof req.body.password === 'string') {
          password = req.body.password
        } else {
          return {
            statusCode: 400,
            body: {
              status: 'Bad password'
            }
          }
        }

        const exists = Boolean(await users.findOne({login_name: loginName}, {session, projection: {login_name: 1}}))
        if (exists) {
          return {
            statusCode: 409,
            body: {
              status: 'User name already taken'
            }
          }
        }

        await createUser(client, session, loginName, fullName, password, type)
        return {
          statusCode: 200,
          body: {
            status: 'User created'
          }
        }
      case 'force_change_password':
        return await withFindUserJson(client, session, req.body, async (user) => {
          if (typeof req.body.password !== 'string') {
            return {
              statusCode: 400,
              body: {
                status: 'Bad Password'
              }
            }
          }

          const password: string = req.body.password

          await changePassword(client, session, user, password)

          return {
            statusCode: 400,
            body: {
              status: 'Password changed'
            }
          }
        })
      case 'delete_user':
        return await withFindUserJson(client, session, req.body, async (delUser) => {
          await deleteUser(client, session, delUser)
          return {
            statusCode: 200,
            body: {
              status: 'User has been deleted'
            }
          }
        })
      case 'create_class':
        return await withFindUserJson(client, session, req.body, async (professor) => {
          let className: string
          if (typeof req.body.className === 'string' && req.body.className.length > 0) {
            className = req.body.className
          } else {
            return {
              statusCode: 400,
              body: {
                status: 'Bad class name'
              }
            }
          }

          if (professor.type === UserType.student) {
            return {
              statusCode: 400,
              body: {
                status: 'Students cannot own classes'
              }
            }
          }

          await createClass(client, session, professor, className)

          return {
            statusCode: 200,
            body: {
              status: 'Class created'
            }
          }
        })
      case 'delete_class':
        return await withFindClassJson(client, session, req.body, async (dbClass) => {
          await deleteClass(client, session, dbClass)

          return {
            statusCode: 200,
            body: {
              status: 'Class deleted'
            }
          }
        })
      case 'add_student_to_class':
        return await withFindUserJson(client, session, req.body, async (student) => {
          return await withFindClassJson(client, session, req.body, async (dbClass) => {
            await addStudent(client, session, dbClass, student)

            return {
              statusCode: 200,
              body: {
                status: 'Student added to class'
              }
            }
          })
        })
      case 'drop_student_from_class':
        return await withFindUserJson(client, session, req.body, async (student) => {
          return await withFindClassJson(client, session, req.body, async (dbClass) => {
            await dropStudent(client, session, dbClass, student)

            return {
              statusCode: 200,
              body: {
                status: 'Student dropped from class'
              }
            }
          })
        })
    }
    return {
      statusCode: 400,
      body: {
        status: 'Unknown command'
      }
    }
  })
}