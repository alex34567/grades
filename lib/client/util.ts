import {ClientUser} from "../common/types";

export async function sendApiPostRequest<T, RET extends {status: string}>(user: ClientUser, link: string, body: T): Promise<RET> {
  const response = await fetch(link, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Grades-Csrf': user.csrf
    },
    body: JSON.stringify(body)
  })

  // If the server crashes it won't send json
  if (response.status === 500) {
    throw response.statusText
  }

  const responseBody = await response.json()
  if (!response.ok) {
    throw responseBody.status
  }

  return responseBody
}