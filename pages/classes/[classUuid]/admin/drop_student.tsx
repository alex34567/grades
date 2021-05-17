import {ClientUser} from "../../../../lib/common/types";
import {GetServerSideProps} from "next";
import {genDropStudentView} from "../../../../lib/server/admin";
import ErrorHandler, {HtmlError} from "../../../../lib/client/ErrorHandler";
import React, {useState} from "react";
import MainTable from '../../../../styles/MainTable.module.css'
import TopBar from "../../../../lib/client/TopBar";
import {sendApiPostRequest} from "../../../../lib/client/util";
import {useRouter} from "next/router";
import Link from "next/link";

export interface DropStudentMeta {
  name: string,
  uuid: string,
}

export interface DropStudentProps {
  className: string,
  classUuid: string,
  students: DropStudentMeta[],
  user: ClientUser
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  return await genDropStudentView(context)
}

export function DropStudent(props: DropStudentProps) {
  const router = useRouter()
  const [dropping, setDropping] = useState(false)
  const [status, setStatus] = useState('')
  const students = []
  for (const student of props.students) {
    async function onDrop() {
      setDropping(true)
      setStatus('Dropping')

      try {
        const ret = await sendApiPostRequest(props.user, '/api/admin', {
          command: 'drop_student_from_class',
          userUuid: student.uuid,
          classUuid: props.classUuid
        })
        setStatus(ret.status)
      } catch (e) {
        setStatus(e.toString())
        setDropping(false)
      }

      router.reload()
    }

    students.push(
      <tr key={student.uuid}>
        <td>{student.name}</td>
        <td><button disabled={dropping} onClick={onDrop}>Drop</button></td>
      </tr>
    )
  }

  return (
    <div>
      <TopBar user={props.user}/>
      <h1>{`Drop student from ${props.className}`}</h1>
      <h3>{status}</h3>
      <Link href={`/classes/${props.classUuid}`}>Back</Link>
      <table className={MainTable.MainTable}>
        <thead>
          <tr>
            <th scope='col'>Name</th>
            <th scope='col'>Drop</th>
          </tr>
        </thead>
        <tbody>
          {students}
        </tbody>
      </table>
    </div>

  )
}

export default function Main(props: DropStudentProps | HtmlError) {
  return <ErrorHandler dispatch={DropStudent} props={props}/>
}