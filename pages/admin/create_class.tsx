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

export function NewClass(props: {user: ClientUser}) {
  const [userName, setUsername] = useState('')
  const [className, setClassName] = useState('')
  const [creating, setCreating] = useState(false)
  const [status, setStatus] = useState('')

  function onChangeUsername(event: ChangeEvent<HTMLInputElement>) {
    setUsername(event.target.value)
  }

  function onChangeClassName(event: ChangeEvent<HTMLInputElement>) {
    setClassName(event.target.value)
  }

  async function onCreate() {
    setCreating(true)
    setStatus('Creating')

    try {
      const ret = await sendApiPostRequest(props.user, '/api/admin', {
        command: 'create_class',
        userName,
        className,
      })
      setStatus(ret.status)
    } catch (e) {
      setStatus(e.toString())
    } finally {
      setCreating(false)
    }
  }

  const valid = !creating

  return (
    <div>
      <TopBar user={props.user}/>
      <Link href='/admin'>Back</Link>
      <h1>Create Class</h1>
      <h3>{status}</h3>
      <label>Professor Username: </label>
      <input className={Box.Box} type='text' onChange={onChangeUsername} value={userName}/>
      <br/>
      <label>Class Name: </label>
      <input className={Box.Box} type='text' onChange={onChangeClassName} value={className}/>
      <br/>
      <button disabled={!valid} onClick={onCreate}>Create</button>
    </div>
  )
}

export default function Main(props: { user: ClientUser } | HtmlError) {
  return <ErrorHandler dispatch={NewClass} props={props}/>
}
