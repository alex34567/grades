import {GetServerSideProps} from "next";
import {htmlTransactionWithUser} from "../lib/server/util";
import {connectToDB} from "../lib/server/db";
import {ClientUser} from "../lib/common/types";
import Error from "next/error";
import React, {ChangeEvent, useState} from "react";
import TopBar from "../lib/client/TopBar";

export const getServerSideProps: GetServerSideProps = async (context) => {
  return await htmlTransactionWithUser(await connectToDB(), context, async (session, user) => {
    return {props: {user}}
  })
}

export default function PasswordChange(rawProps: {user: ClientUser} | {error: number}) {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changing, setChanging] = useState(false)
  const [status, setStatus] = useState()

  if (typeof (rawProps as any).error !== 'undefined') {
    return <Error statusCode={(rawProps as any).error}/>
  }
  const user = (rawProps as { user: ClientUser }).user


  function onChangeOldPassword(event: ChangeEvent<HTMLInputElement>) {
    setOldPassword(event.target.value)
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
      const changeResponse = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Grades-CSRF': 'login'
        },
        body: JSON.stringify({
          command: 'change_password',
          old_password: oldPassword,
          new_password: newPassword
        })
      })
      const changeJson = await changeResponse.json()
      setStatus(changeJson.status)
      if (changeResponse.ok) {
        setOldPassword('')
        setNewPassword('')
        setConfirmPassword('')
      }
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
      <h3>{status}</h3>
      <label>Old Password: </label>
      <input type='password' onChange={onChangeOldPassword} value={oldPassword}/>
      <br/>
      <label>New Password: </label>
      <input type='password' onChange={onChangeNewPassword} value={newPassword}/>
      <br/>
      <label>Confirm Password: </label>
      <input type='password' onChange={onChangeConfirmPassword} value={confirmPassword}/>
      <br/>
      <button disabled={!valid} onClick={onChangePassword}>Change</button>
      <br/>
      <p>Password must be at least 8 chars and no more than 64 chars</p>
    </div>
  )
}