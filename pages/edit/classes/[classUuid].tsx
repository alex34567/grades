import {GetServerSideProps} from "next";
import {genProfessorClassView} from "../../../lib/server/class";
import {ClientClass, ClientUser} from "../../../lib/common/types";
import Error from "next/error";
import React from "react";
import TopBar from "../../../lib/client/TopBar";
import mainTable from "../../../styles/MainTable.module.css";
import Link from 'next/link'
import {millipointToString} from "../../../lib/common/fraction";

export const getServerSideProps: GetServerSideProps = async (context) => {
  return (await genProfessorClassView(context))!
}

export interface ClassViewProps {
  classView: ClientClass
  user: ClientUser
}

export default function ClassEdit(rawProps: ClassViewProps | {error: number}) {
  if (typeof (rawProps as any).error !== 'undefined') {
    return <Error statusCode={(rawProps as any).error}/>
  }
  const props = rawProps as ClassViewProps

  const categories = []
  for (const category of props.classView.categories) {
    const assignments = []
    for (const assignment of category.assignments) {
      const assignmentEditUrl = `/edit/classes/${props.classView.uuid}/assignments/${assignment.uuid}`
      assignments.push(
        <tr key={assignment.uuid}>
          <td><Link href={assignmentEditUrl}>{assignment.name}</Link></td>
          <td>{millipointToString(assignment.max_points)}</td>
          <td>
            <Link href={assignmentEditUrl}>Edit</Link>
            <span> </span>
            <a href='#'>Delete</a>
          </td>
        </tr>
      )
    }
    const newAssignmentUrl = `/edit/classes/${props.classView.uuid}/assignments/new?categoryUuid=${category.uuid}`
    categories.push(
      <React.Fragment key={category.uuid}>
        <tr>
          <th scope='col'>Name</th>
          <th scope='col'>Max Score</th>
          <th scope='col'>Actions</th>
        </tr>
        <tr>
          <th>{category.name}</th>
          <td>{millipointToString(category.weight)}</td>
          <td>
            <a href={newAssignmentUrl}>New Assignment</a>
            <span> </span>
            <a href='#'>Delete Category</a>
          </td>
        </tr>
        {assignments}
      </React.Fragment>
    )
  }

  return (
    <div>
      <TopBar user={props.user}/>
      <h1>{`Class: ${props.classView.name}`}</h1>
      <h2>{`Professor: ${props.classView.professor_name}`}</h2>
      <table className={mainTable.MainTable}>
        <tbody>
        {categories}
        </tbody>
      </table>
    </div>
  )
}