import Link from 'next/link'
import MainTable from '../../styles/MainTable.module.css'
import TopBar from "./TopBar";
import {ClientUser} from "../common/types";

export interface ClassMeta {
  name: string,
  uuid: string
}

export interface ProfessorClassListProps {
  classMetas: ClassMeta[],
  user: ClientUser
}

export default function ProfessorClassList(props: ProfessorClassListProps) {
  const classes = []
  for (const profClass of props.classMetas) {
    classes.push(
      <tr key={profClass.uuid}>
        <td><Link href={`/classes/${profClass.uuid}`}>{profClass.name}</Link></td>
      </tr>
    )
  }

  return (
    <div>
      <TopBar user={props.user}/>
      <h1>Your classes</h1>
      <table className={MainTable.MainTable}>
        <thead>
          <tr><th>Name</th></tr>
        </thead>
        <tbody>
          {classes}
        </tbody>
      </table>
    </div>
  )
}