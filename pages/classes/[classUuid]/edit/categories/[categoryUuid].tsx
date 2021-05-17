import {GetServerSideProps} from "next";
import {genCategoryView} from "../../../../../lib/server/class";
import {CategoryViewProps} from "../../../../../lib/common/types";
import ErrorHandler, {HtmlError} from "../../../../../lib/client/ErrorHandler";
import React, {ChangeEvent, useState} from "react";
import TopBar from "../../../../../lib/client/TopBar";
import Link from "next/link";
import {millipointToString, stringToMillipoint} from "../../../../../lib/common/fraction";
import Box from '../../../../../styles/InputBox.module.css'
import {sendApiPostRequest} from "../../../../../lib/client/util";
import {useRouter} from "next/router";

export const getServerSideProps: GetServerSideProps = async (context) => {
  return await genCategoryView(context)
}

export function CategoryMetaEdit (props: CategoryViewProps) {
  const [name, setName] = useState(props.category.name)
  const [weight, setWeight] = useState(millipointToString(props.category.weight))
  const [updating, setUpdating] = useState(false)
  const [status, setStatus] = useState('')
  const router = useRouter()

  function onChangeName(event: ChangeEvent<HTMLInputElement>) {
    setName(event.target.value)
  }

  function onChangeWeight(event: ChangeEvent<HTMLInputElement>) {
    setWeight(event.target.value)
  }

  async function onDelete() {
    if (props.category.assignments.length === 0) {
      if (!confirm(`Are you sure that you want to delete ${props.category.name}?`)) {
        return
      }
    } else {
      const warning = 'DELETING THIS CATEGORY WILL DELETE ALL OF ITS ASSIGNMENTS! To confirm please type "Yes I am sure"'
      const expectedConfirmText = "Yes I am sure".toUpperCase()
      let confirmText = prompt(warning)
      if (!confirmText) {
        confirmText = ''
      }
      if (confirmText.toUpperCase().trim() !== expectedConfirmText) {
        return
      }
    }

    setUpdating(true)
    setStatus('Deleting')

    try {
      await sendApiPostRequest(props.user, '/api/class', {
        command: 'delete_category',
        classUuid: props.classUuid,
        categoryUuid: props.category.uuid
      })
      await router.push(`/classes/${props.classUuid}/edit`)
    } catch (e) {
      setStatus(e.toString())
      setUpdating(false)
    }
  }

  async function onUpdate() {
    setUpdating(true)
    setStatus('Updating')

    const categoryMeta = {
      name,
      uuid: props.category.uuid,
      weight: stringToMillipoint(weight)!,
    }

    try {
      const ret = await sendApiPostRequest(props.user, '/api/class', {
        command: 'edit_category',
        classUuid: props.classUuid,
        categoryMeta
      })
      setStatus(ret.status)
    } catch (e) {
      setStatus(e.toString())
    } finally {
      setUpdating(false)
    }
  }

  let valid = !updating

  let nameClassName = Box.Box
  if (name.length < 1) {
    nameClassName = Box.Error
    valid = false
  }

  let weightClassName = Box.Box
  if (typeof stringToMillipoint(weight) !== 'number') {
    weightClassName = Box.Error
    valid = false
  }

  return (
    <div>
      <TopBar user={props.user}/>
      <Link href={`/classes/${props.classUuid}/edit`}>Back</Link>
      <br/>
      <h3>{status}</h3>
      <label>Category Name: </label>
      <input className={nameClassName} onChange={onChangeName} type='text' value={name}/>
      <br/>
      <label>Weight: </label>
      <input className={weightClassName} onChange={onChangeWeight} type='text' value={weight}/>
      <br/>
      <button onClick={onUpdate} disabled={!valid}>Update</button>
      <button disabled={updating} onClick={onDelete}>Delete</button>
    </div>
  )
}

export default function Main(props: CategoryViewProps | HtmlError) {
  return <ErrorHandler dispatch={CategoryMetaEdit} props={props}/>
}