import {NextApiRequest, NextApiResponse} from 'next'
import {connectToDB} from '../../lib/server/db'
import {login, logout, userFromSessionNoValidate} from '../../lib/server/user'

export interface LoginResponse {
  status: string,
  logged_in: boolean
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<LoginResponse>) {
  const client = await connectToDB()
  const user = await userFromSessionNoValidate(client, req, res)
  const logged_in = Boolean(user)

  if (req.method === 'GET' || req.method === 'HEAD') {
    if (req.method === 'GET') {
      let status = 'Logged Out'
      if (logged_in) {
        status = 'Logged In'
      }
      res.json({
        status,
        logged_in,
      })
    }
    res.status(200)
  } else if (req.method === 'POST') {
    if (req.headers['x-grades-csrf'] !== 'login') {
      res.status(400);
      res.json({
        status: 'Cors custom header needed',
        logged_in,
      })
      return
    }

    if (req.headers['content-type'] !== 'application/json') {
      res.status(400)
      res.json({
        status: 'Only json bodies can be sent',
        logged_in,
      })
      return
    }

    if (req.body.command === 'login') {
      const username = req.body.username as unknown
      if (typeof username !== 'string') {
        res.status(400)
        res.json({
          status: 'Username invalid',
          logged_in,
        })
        return
      }
      const password = req.body.password as unknown
      if (typeof password !== 'string') {
        res.status(400)
        res.json({
          status: 'Password invalid',
          logged_in,
        })
        return
      }

      if (logged_in) {
        await logout(client, req, res)
      }

      const login_successful = await login(client, req, res, username, password)
      if (login_successful) {
        res.json({
          status: 'Logged in',
          logged_in: true,
        })
      } else {
        res.status(403)
        res.json({
          status: 'Login error: Invalid username/password?',
          logged_in: false,
        })
      }
    } else if (req.body.command === 'logout') {
      await logout(client, req, res);
      res.json({
        status: 'Logged Out',
        logged_in: false,
      })
    } else {
      res.status(400);
      res.json({
        status: 'Unknown or missing command',
        logged_in,
      })
      return
    }
    res.status(200)
  }
}
