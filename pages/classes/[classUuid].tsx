import {GetServerSideProps} from "next";
import {getProfessorClassOverview} from "../../lib/server/class";
import {ClientUser, Fraction, UserType} from "../../lib/common/types";
import ErrorHandler, {HtmlError} from "../../lib/client/ErrorHandler";
import React from "react";
import TopBar from "../../lib/client/TopBar";
import MainTable from '../../styles/MainTable.module.css'
import {
  fractionToLetterGrade,
  fractionToPercent,
  fractionToString,
} from "../../lib/common/fraction";
import Link from 'next/link'

export const getServerSideProps: GetServerSideProps = async (context) => {
  return await getProfessorClassOverview(context)
}

export interface ProfessorGradeEntry {
  uuid: string,
  name: string,
  grade: Fraction
}

export interface ProfessorClassOverviewProps {
  className: string,
  classUuid: string,
  professorName: string,
  studentGrades: ProfessorGradeEntry[],
  user: ClientUser
}

export function ProfessorClassOverview(props: ProfessorClassOverviewProps) {
  const sortedGrades = props.studentGrades.concat()
  sortedGrades.sort((lhs, rhs) => lhs.name.localeCompare(rhs.name))

  const students = []

  for (const student of sortedGrades) {
    students.push(
      <tr key={student.uuid}>
        <td><Link href={`/students/${student.uuid}/classes/${props.classUuid}`}>{student.name}</Link></td>
        <td>{`${fractionToLetterGrade(student.grade)} (${fractionToPercent(student.grade)})`}</td>
        <td>{fractionToString(student.grade)}</td>
      </tr>
    )
  }

  let admin
  if (props.user.type === UserType.admin) {
    admin = <div><Link href={`/classes/${props.classUuid}/admin`}>Admin Class Tools</Link></div>
  }

  return (
    <div>
      <TopBar user={props.user}/>
      <h1>{`Class Name: ${props.className}`}</h1>
      <h2>{`Professor Name: ${props.professorName}`}</h2>
      <Link href={`/classes/${props.classUuid}/edit`}>Edit</Link>
      {admin}
      <table className={MainTable.MainTable}>
        <thead>
          <tr>
            <th>Student Name</th>
            <th>Grade</th>
            <th>Points</th>
          </tr>
        </thead>
        <tbody>
          {students}
        </tbody>
      </table>
    </div>
  )
}

export default function Main(props: ProfessorClassOverviewProps | HtmlError) {
  return <ErrorHandler dispatch={ProfessorClassOverview} props={props}/>
}