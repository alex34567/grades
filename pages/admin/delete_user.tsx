import {GetServerSideProps} from "next";
import {ClientUser} from "../../lib/common/types";
import ErrorHandler, {HtmlError} from "../../lib/client/ErrorHandler";
import React, {ChangeEvent, useState} from "react";
import {authAdmin} from "../../lib/server/admin";
import TopBar from "../../lib/client/TopBar";
import Link from 'next/link'
import Box from '../../styles/InputBox.module.css'
import {sendApiPostRequest} from "../../lib/client/util";

export const getServerSideProps: GetServerSideProps = async (context) => {
  return await authAdmin(context)
}

export function DelUser(props: {user: ClientUser}) {
  const [userName, setUsername] = useState('')
  const [deleting, setCreating] = useState(false)
  const [status, setStatus] = useState('')

  function onChangeUsername(event: ChangeEvent<HTMLInputElement>) {
    setUsername(event.target.value)
  }

  async function onDelete() {
    setCreating(true)
    setStatus('Deleting')

    try {
      const ret = await sendApiPostRequest(props.user, '/api/admin', {
        command: 'delete_user',
        userName,
      })
      setStatus(ret.status)
    } catch (e) {
      setStatus(e.toString())
    } finally {
      setCreating(false)
    }
  }

  const valid = !deleting

  return (
    <div>
      <TopBar user={props.user}/>
      <Link href='/admin'>Back</Link>
      <h1>Delete User</h1>
      <h3>{status}</h3>
      <label>Username: </label>
      <input className={Box.Box} type='text' onChange={onChangeUsername} value={userName}/>
      <br/>
      <button disabled={!valid} onClick={onDelete}>Delete</button>
    </div>
  )
}

export default function Main(props: { user: ClientUser } | HtmlError) {
  return <ErrorHandler dispatch={DelUser} props={props}/>
}
