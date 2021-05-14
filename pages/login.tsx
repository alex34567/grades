import {ChangeEvent, useState} from "react";
import {useRouter} from "next/router";

export default function LoginPage() {
  const [loggingIn, setLoggingIn] = useState(false)
  const [loginError, setLoginError] = useState<string>()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const router = useRouter()

  function onChangeUsername(event: ChangeEvent<HTMLInputElement>) {
    setUsername(event.target.value)
  }

  function onChangePassword(event: ChangeEvent<HTMLInputElement>) {
    setPassword(event.target.value)
  }

  async function onLogin() {
    if (loggingIn) {
      return
    }

    setLoggingIn(true)
    try {
      const loginResponse = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Grades-CSRF': 'login'
        },
        body: JSON.stringify({
          command: 'login',
          username,
          password
        })
      })
      const loginJson = await loginResponse.json()
      if (!loginResponse.ok) {
        setLoginError(loginJson.status)
      } else {
        setLoginError(undefined)
        if (typeof router.query.redirect === 'string') {
          await router.push(decodeURIComponent(router.query.redirect))
        } else {
          await router.push('/')
        }
      }
    } catch (e) {
      setLoginError(e.toString())
      setLoggingIn(false)
    }
  }

  return (
    <div>
      <h3>{loginError}</h3>
      <label>Username: </label>
      <input disabled={loggingIn} type='text' value={username} onChange={onChangeUsername}/>
      <br/>
      <label>Password: </label>
      <input disabled={loggingIn} type='password' value={password} onChange={onChangePassword}/>
      <br/>
      <button disabled={loggingIn} onClick={onLogin}>Login</button>
    </div>
  )
}