import {GetServerSideProps} from "next";
import {authClassAdmin} from "../../../../lib/server/admin";
import {ClassAdminProps} from "../../../../lib/common/types";
import TopBar from "../../../../lib/client/TopBar";
import Link from "next/link";
import ErrorHandler, {HtmlError} from "../../../../lib/client/ErrorHandler";
import React, {ChangeEvent, useState} from "react";
import {sendApiPostRequest} from "../../../../lib/client/util";

export const getServerSideProps: GetServerSideProps = async (context) => {
  return await authClassAdmin(context)
}

export function AddStudent(props: ClassAdminProps) {
  const [userName, setUserName] = useState('')
  const [adding, setAdding] = useState(false)
  const [status, setStatus] = useState('')

  function onChangeUserName(event: ChangeEvent<HTMLInputElement>) {
    setUserName(event.target.value)
  }

  async function onAdd() {
    setAdding(true)
    setStatus('Adding')

    try {
      const ret = await sendApiPostRequest(props.user, '/api/admin', {
        command: 'add_student_to_class',
        userName,
        classUuid: props.classUuid
      })
      setStatus(ret.status)
    } catch (e) {
      setStatus(e.toString())
    } finally {
      setAdding(false)
    }
  }

  return (
    <div>
      <TopBar user={props.user}/>
      <h1>{`Add student to ${props.className}`}</h1>
      <h3>{status}</h3>
      <Link href={`/classes/${props.classUuid}`}>Back</Link>
      <br/>
      <label>Student Username: </label>
      <input onChange={onChangeUserName} type='text' value={userName}/>
      <br/>
      <button onClick={onAdd} disabled={adding}>Add</button>
    </div>
  )
}

export default function Main(props: ClassAdminProps | HtmlError) {
  return <ErrorHandler dispatch={AddStudent} props={props}/>
}