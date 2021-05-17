import {GetServerSideProps} from "next";
import {authClassAdmin} from "../../../../lib/server/admin";
import {ClassAdminProps} from "../../../../lib/common/types";
import ErrorHandler, {HtmlError} from "../../../../lib/client/ErrorHandler";
import React, {useState} from "react";
import {DropStudentProps} from "./drop_student";
import TopBar from "../../../../lib/client/TopBar";
import {sendApiPostRequest} from "../../../../lib/client/util";
import {useRouter} from "next/router";

export const getServerSideProps: GetServerSideProps = async (context) => {
  return await authClassAdmin(context)
}

export function DeleteClass(props: ClassAdminProps) {
  const [deleting, setDeleting] = useState(false)
  const [status, setStatus] = useState('')
  const router = useRouter()

  async function onDelete() {
    setDeleting(true)
    setStatus('Deleting')

    try {
      const ret = await sendApiPostRequest(props.user, '/api/admin', {
        command: 'delete_class',
        classUuid: props.classUuid
      })
      setStatus(ret.status)
      await router.push('/')
    } catch (e) {
      setStatus(e.toString())
    }
  }

  return (
    <div>
      <TopBar user={props.user}/>
      <h1>{`ARE YOU SURE THAT YOU WANT TO DELETE ${props.className}!`}</h1>
      <h3>{status}</h3>
      <button onClick={onDelete} disabled={deleting}>Yes</button>
    </div>
  )
}

export default function Main(props: DropStudentProps | HtmlError) {
  return <ErrorHandler dispatch={DeleteClass} props={props}/>
}