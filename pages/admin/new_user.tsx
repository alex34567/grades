import {GetServerSideProps} from "next";
import {ClientUser, UserType} from "../../lib/common/types";
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

export function NewUser(props: {user: ClientUser}) {
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [type, setType] = useState(UserType.student)
  const [creating, setCreating] = useState(false)
  const [status, setStatus] = useState('')

  function onChangeUsername(event: ChangeEvent<HTMLInputElement>) {
    setUsername(event.target.value)
  }

  function onChangeFullName(event: ChangeEvent<HTMLInputElement>) {
    setFullName(event.target.value)
  }

  function onChangePassword(event: ChangeEvent<HTMLInputElement>) {
    setPassword(event.target.value)
  }

  function onChangeConfirmPassword(event: ChangeEvent<HTMLInputElement>) {
    setConfirmPassword(event.target.value)
  }

  function onChangeType(event: ChangeEvent<HTMLSelectElement>) {
    setType(Number(event.target.value) as UserType)
  }

  async function onCreate() {
    setCreating(true)
    setStatus('Creating')

    try {
      const ret = await sendApiPostRequest(props.user, '/api/admin', {
        command: 'new_user',
        type,
        fullName,
        loginName: username,
        password
      })
      setStatus(ret.status)
    } catch (e) {
      setStatus(e.toString())
    } finally {
      setCreating(false)
    }
  }

  const confirmValid = password === confirmPassword
  let confirmClassName = Box.Box
  if (!confirmValid) {
    confirmClassName = Box.Error
  }

  const valid = !creating && confirmValid

  return (
    <div>
      <TopBar user={props.user}/>
      <Link href='/admin'>Back</Link>
      <h1>New User</h1>
      <h3>{status}</h3>
      <label>Username: </label>
      <input className={Box.Box} type='text' onChange={onChangeUsername} value={username}/>
      <br/>
      <label>Password: </label>
      <input className={Box.Box} type='password' onChange={onChangePassword} value={password}/>
      <br/>
      <label>Confirm: </label>
      <input className={confirmClassName} type='password' onChange={onChangeConfirmPassword} value={confirmPassword}/>
      <br/>
      <label>Full Name: </label>
      <input className={Box.Box} type='text' onChange={onChangeFullName} value={fullName}/>
      <br/>
      <label>User Type: </label>
      <select value={type} onChange={onChangeType}>
        <option value={UserType.admin}>
          Admin
        </option>
        <option value={UserType.professor}>
          Professor
        </option>
        <option value={UserType.student}>
          Student
        </option>
      </select>
      <br/>
      <button disabled={!valid} onClick={onCreate}>Create</button>
    </div>
  )
}

export default function Main(props: { user: ClientUser } | HtmlError) {
  return <ErrorHandler dispatch={NewUser} props={props}/>
}
