import {GetServerSideProps} from "next";
import {ClientUser} from "../../lib/common/types";
import React, {ChangeEvent, useState} from "react";
import TopBar from "../../lib/client/TopBar";
import {authAdmin} from "../../lib/server/admin";
import ErrorHandler, {HtmlError} from "../../lib/client/ErrorHandler";
import {sendApiPostRequest} from "../../lib/client/util";
import Link from "next/link";

export const getServerSideProps: GetServerSideProps = async (context) => {
  return await authAdmin(context)
}

export function PasswordChange(props: {user: ClientUser}) {
  const [userName, setUserName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changing, setChanging] = useState(false)
  const [status, setStatus] = useState('')

  const user = props.user

  function onChangeUsername(event: ChangeEvent<HTMLInputElement>) {
    setUserName(event.target.value)
  }

  function onChangeNewPassword(event: ChangeEvent<HTMLInputElement>) {
    setNewPassword(event.target.value)
  }

  function onChangeConfirmPassword(event: ChangeEvent<HTMLInputElement>) {
    setConfirmPassword(event.target.value)
  }

  async function onChangePassword() {
    setChanging(true)

    try {
      const changeResponse = await sendApiPostRequest(props.user, '/api/admin', {
        command: 'force_change_password',
        userName,
        password: newPassword
      })
      setStatus(changeResponse.status)
    } catch (e) {
      setStatus(e.toString())
    } finally {
      setChanging(false)
    }
  }

  const valid = !changing && newPassword === confirmPassword && newPassword.length >= 8 && newPassword.length <= 64

  return (
    <div>
      <TopBar user={user}/>
      <Link href='/admin'>Back</Link>
      <h1>Force Change Password</h1>
      <h3>{status}</h3>
      <label>User: </label>
      <input type='text' onChange={onChangeUsername} value={userName}/>
      <br/>
      <label>New Password: </label>
      <input type='password' onChange={onChangeNewPassword} value={newPassword}/>
      <br/>
      <label>Confirm Password: </label>
      <input type='password' onChange={onChangeConfirmPassword} value={confirmPassword}/>
      <br/>
      <button disabled={!valid} onClick={onChangePassword}>Change</button>
      <br/>
    </div>
  )
}

export default function Main(props: { user: ClientUser } | HtmlError) {
  return <ErrorHandler dispatch={PasswordChange} props={props}/>
}