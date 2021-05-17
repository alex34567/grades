import {GetServerSideProps} from "next";
import {genProfessorClassView} from "../../../lib/server/class";
import {ClientClass, ClientUser} from "../../../lib/common/types";
import React, {useState} from "react";
import TopBar from "../../../lib/client/TopBar";
import mainTable from "../../../styles/MainTable.module.css";
import Link from 'next/link'
import {millipointToString} from "../../../lib/common/fraction";
import {sendApiPostRequest} from "../../../lib/client/util";
import {useRouter} from "next/router";
import ErrorHandler, {HtmlError} from "../../../lib/client/ErrorHandler";

export const getServerSideProps: GetServerSideProps = async (context) => {
  return (await genProfessorClassView(context))!
}

export interface ClassViewProps {
  classView: ClientClass
  user: ClientUser
}

export function ClassEdit(props: ClassViewProps) {
  const [updating, setUpdating] = useState(false)
  const [status, setStatus] = useState('')
  const router = useRouter()

  const categories = []
  for (const category of props.classView.categories) {
    const assignments = []
    for (const assignment of category.assignments) {
      async function onAssignDelete() {
        if (updating) {
          return
        }

        if (!confirm(`Are you sure that you want to delete ${assignment.name}?`)) {
          return
        }

        setUpdating(true)
        setStatus('Deleting')

        try {
          await sendApiPostRequest(props.user, '/api/class', {
            command: 'delete_assignment',
            classUuid: props.classView.uuid,
            assignmentUuid: assignment.uuid
          })
          router.reload()
        } catch (e) {
          setStatus(e.toString())
          setUpdating(false)
        }
      }

      const assignmentEditUrl = `/classes/${props.classView.uuid}/edit/assignments/${assignment.uuid}`
      assignments.push(
        <tr key={assignment.uuid}>
          <td><Link href={assignmentEditUrl}>{assignment.name}</Link></td>
          <td>{millipointToString(assignment.max_points)}</td>
          <td>
            <Link href={assignmentEditUrl}>Edit</Link>
            <span> </span>
            <a href='#' onClick={onAssignDelete}>Delete</a>
          </td>
        </tr>
      )
    }
    const newAssignmentUrl = `/classes/${props.classView.uuid}/edit/assignments/new?categoryUuid=${category.uuid}`
    const reorderUrl = `/classes/${props.classView.uuid}/edit/categories/${category.uuid}/assignment_order`
    const editCategoryUrl = `/classes/${props.classView.uuid}/edit/categories/${category.uuid}`
    categories.push(
      <React.Fragment key={category.uuid}>
        <tr>
          <th scope='col'>Name</th>
          <th scope='col'>Max Score</th>
          <th scope='col'>Actions</th>
        </tr>
        <tr>
          <th><a href={editCategoryUrl}>{category.name}</a></th>
          <td>{millipointToString(category.weight)}</td>
          <td>
            <a href={newAssignmentUrl}>New Assignment</a>
            <span> </span>
            <a href={reorderUrl}>Reorder Assignments</a>
            <span> </span>
            <a href={editCategoryUrl}>Edit Category</a>
          </td>
        </tr>
        {assignments}
      </React.Fragment>
    )
  }

  return (
    <div>
      <TopBar user={props.user}/>
      <h3>{status}</h3>
      <h1>{`Class: ${props.classView.name}`}</h1>
      <h2>{`Professor: ${props.classView.professor_name}`}</h2>
      <Link href={`/classes/${props.classView.uuid}/edit/categories/new`}>New Category</Link>
      <table className={mainTable.MainTable}>
        <tbody>
        {categories}
        </tbody>
      </table>
    </div>
  )
}

export default function Main(props: ClassViewProps | HtmlError) {
  return <ErrorHandler dispatch={ClassEdit} props={props}/>
}
