import {NextApiRequest, NextApiResponse} from 'next'
import {connectToDB} from '../../lib/server/db'
import {login, logout, userFromSessionNoValidate} from '../../lib/server/user'

export interface LoginResponse {
  status: string,
  logged_in: boolean
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<LoginResponse>) {
  const client = await connectToDB()
  const session = client.startSession()

  async function runTransaction() {
    const rawUser = await userFromSessionNoValidate(client, session, req)
    const user = rawUser.data
    let cookies = rawUser.cookies
    const logged_in = Boolean(user)

    if (req.method === 'GET' || req.method === 'HEAD') {
      if (req.method === 'GET') {
        let status = 'Logged Out'
        if (logged_in) {
          status = 'Logged In'
        }
        return {
          cookies,
          statusCode: 200,
          body: {
            status,
            logged_in,
          }
        }
      }
    } else if (req.method === 'POST') {
      if (req.headers['x-grades-csrf'] !== 'login') {
        return {
          cookies,
          statusCode: 400,
          body: {
            status: 'Cors custom header needed',
            logged_in,
          }
        }
      }

      if (req.headers['content-type'] !== 'application/json') {
        return {
          cookies,
          statusCode: 400,
          body: {
            status: 'Only json bodies can be sent',
            logged_in,
          }
        }
      }

      if (req.body.command === 'login') {
        const username = req.body.username as unknown
        if (typeof username !== 'string') {
          return {
            cookies,
            statusCode: 400,
            body: {
              status: 'Username invalid',
              logged_in,
            }
          }
        }
        const password = req.body.password as unknown
        if (typeof password !== 'string') {
          return {
            cookies,
            statusCode: 400,
            body: {
              status: 'Password invalid',
              logged_in,
            }
          }
        }

        if (logged_in) {
          cookies = await logout(client, session, req)
        }

        const login_successful = await login(client, session, req, res, username, password)
        if (login_successful) {
          return {
            cookies: login_successful,
            statusCode: 200,
            body: {
              status: 'Logged in',
              logged_in: true,
            }
          }
        } else {
          return {
            cookies,
            statusCode: 403,
            body: {
              status: 'Login error: Invalid username/password?',
              logged_in: false,
            }
          }
        }
      } else if (req.body.command === 'logout') {
        cookies = await logout(client, session, req)
        return {
          cookies,
          statusCode: 200,
          body: {
            status: 'Logged Out',
            logged_in: false,
          }
        }
      } else {
        return {
          cookies,
          statusCode: 400,
          body: {
            status: 'Unknown or missing command',
            logged_in,
          }
        }
      }
    }
  }

  let rawRet: { cookies: string[]; statusCode: number; body: { status: string; logged_in: boolean } } | undefined

  try {
    await session.withTransaction(async () => {
      rawRet = await runTransaction()
    })
  } finally {
    await session.endSession()
  }

  let ret = rawRet!

  res.status(ret.statusCode)
  if (ret.cookies) {
    res.setHeader('Set-Cookie', ret.cookies)
  }
  res.json(ret.body)
}
