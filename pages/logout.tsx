import {useEffect, useState} from "react";
import {useRouter} from "next/router";

export default function LogoutPage() {
  const [error, setError] = useState()
  const router = useRouter()

  useEffect(() => {(async () => {
    try {
      const loginResponse = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Grades-CSRF': 'login'
        },
        body: JSON.stringify({
          command: 'logout',
        })
      })
      const loginJson = await loginResponse.json()
      if (!loginResponse.ok) {
        setError(loginJson.status)
      } else {
        await router.push('/')
      }
    } catch (e) {
      setError(e.toString())
    }
  })()}, [])

  if (error) {
    return <h1>{error}</h1>
  } else {
    return <p>Logging Out</p>
  }
}