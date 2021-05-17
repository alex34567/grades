import {GetServerSideProps} from "next";
import {genMultiCategoryView} from "../../../../../lib/server/class";
import {MultiCategoryProps} from "../../../../../lib/common/types";
import ErrorHandler, {HtmlError} from "../../../../../lib/client/ErrorHandler";
import React, {ChangeEvent, useState} from "react";
import MainTable from '../../../../../styles/MainTable.module.css'
import TopBar from "../../../../../lib/client/TopBar";
import {sendApiPostRequest} from "../../../../../lib/client/util";
import Link from "next/link";

export const getServerSideProps: GetServerSideProps = async (context) => {
  return await genMultiCategoryView(context)
}

export function ReorderAssignments (props: MultiCategoryProps) {
  const [categories, setCategories] = useState(props.categories)
  const [status, setStatus] = useState('')
  const [updating, setUpdating] = useState(false)

  async function onUpdate() {
    setStatus('Updating')
    setUpdating(true)

    const categoryUuids = categories.map(a => a.uuid)

    try {
      const ret = await sendApiPostRequest(props.user, '/api/class', {
        categoryUuids,
        classUuid: props.classUuid,
        command: 'reorder_categories'
      })
      setStatus(ret.status)
    } catch (e) {
      setStatus(e.toString())
    } finally {
      setUpdating(false)
    }
  }

  const renderAssignments = []
  for (let i = 0; i < categories.length; i++) {
    const belowList = []
    belowList.push(<option key='top' value='top'>-</option>)
    for (let category of categories) {
      if (category === categories[i]) {
        continue
      }
      belowList.push(<option key={category.uuid} value={category.uuid}>{category.name}</option> )
    }


    let below = 'top'
    if (i !== 0) {
      below = categories[i - 1].uuid
    }

    function onReorder(event: ChangeEvent<HTMLSelectElement>) {
      const newBelow = event.target.value
      if (newBelow === below) {
        return
      }

      const goneAssignments = categories.filter(a => a.uuid !== categories[i].uuid)
      if (newBelow === 'top') {
        goneAssignments.unshift(categories[i])
        setCategories(goneAssignments)
      } else {
        let insertPoint = goneAssignments.findIndex(a => a.uuid === newBelow) + 1
        const before = goneAssignments.slice(0, insertPoint)
        const after = goneAssignments.slice(insertPoint)
        setCategories(before.concat([categories[i]], after))
      }
    }

    renderAssignments.push(
      <tr key={categories[i].uuid}>
        <td>{categories[i].name}</td>
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

export default function Main(props: MultiCategoryProps | HtmlError) {
  return <ErrorHandler dispatch={ReorderAssignments} props={props}/>
}