import {GetServerSideProps} from "next";
import {genCategoryView} from "../../../../../../lib/server/class";
import {CategoryViewProps} from "../../../../../../lib/common/types";
import ErrorHandler, {HtmlError} from "../../../../../../lib/client/ErrorHandler";
import React, {ChangeEvent, useState} from "react";
import MainTable from '../../../../../../styles/MainTable.module.css'
import TopBar from "../../../../../../lib/client/TopBar";
import {sendApiPostRequest} from "../../../../../../lib/client/util";
import Link from "next/link";

export const getServerSideProps: GetServerSideProps = async (context) => {
  return await genCategoryView(context)
}

export function ReorderAssignments (props: CategoryViewProps) {
  const [assignments, setAssignments] = useState(props.category.assignments)
  const [status, setStatus] = useState('')
  const [updating, setUpdating] = useState(false)

  async function onUpdate() {
    setStatus('Updating')
    setUpdating(true)

    const assignmentUuids = assignments.map(a => a.uuid)

    try {
      const ret = await sendApiPostRequest(props.user, '/api/class', {
        assignmentUuids,
        categoryUuid: props.category.uuid,
        classUuid: props.classUuid,
        command: 'reorder_assignments'
      })
      setStatus(ret.status)
    } catch (e) {
      setStatus(e.toString())
    } finally {
      setUpdating(false)
    }
  }

  const renderAssignments = []
  for (let i = 0; i < assignments.length; i++) {
    const belowList = []
    belowList.push(<option key='top' value='top'>-</option>)
    for (let assignment of assignments) {
      if (assignment === assignments[i]) {
        continue
      }
      belowList.push(<option key={assignment.uuid} value={assignment.uuid}>{assignment.name}</option> )
    }


    let below = 'top'
    if (i !== 0) {
      below = assignments[i - 1].uuid
    }

    function onReorder(event: ChangeEvent<HTMLSelectElement>) {
      const newBelow = event.target.value
      if (newBelow === below) {
        return
      }

      const goneAssignments = assignments.filter(a => a.uuid !== assignments[i].uuid)
      if (newBelow === 'top') {
        goneAssignments.unshift(assignments[i])
        setAssignments(goneAssignments)
      } else {
        let insertPoint = goneAssignments.findIndex(a => a.uuid === newBelow) + 1
        const before = goneAssignments.slice(0, insertPoint)
        const after = goneAssignments.slice(insertPoint)
        setAssignments(before.concat([assignments[i]], after))
      }
    }

    renderAssignments.push(
      <tr key={assignments[i].uuid}>
        <td>{assignments[i].name}</td>
        <td>
          <select onChange={onReorder} value={below}>
            {belowList}
          </select>
        </td>
      </tr>
    )
  }

  return (
    <div>
      <TopBar user={props.user}/>
      <Link href={`/classes/${props.classUuid}/edit`}>Back</Link>
      <h3>{status}</h3>
      <table className={MainTable.MainTable}>
        <thead>
        <tr>
          <th scope='col'>Name</th>
          <th scope='col'>Below</th>
        </tr>
        <tr>
          <th scope='row'>-</th>
          <td/>
        </tr>
        </thead>
        <tbody>
        {renderAssignments}
        </tbody>
      </table>
      <button disabled={updating} onClick={onUpdate}>Reorder</button>
    </div>

  )
}

export default function Main(props: CategoryViewProps | HtmlError) {
  return <ErrorHandler dispatch={ReorderAssignments} props={props}/>
}