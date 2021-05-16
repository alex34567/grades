import {GetServerSideProps} from "next";
import {genNewAssignmentView} from "../../../../../lib/server/class";
import {ClassCategory, ClientUser} from "../../../../../lib/common/types";
import Error from "next/error";
import React, {ChangeEvent, useState} from "react";
import TopBar from "../../../../../lib/client/TopBar";
import Box from '../../../../../styles/InputBox.module.css'
import {useRouter} from "next/router";
import {stringToMillipoint} from "../../../../../lib/common/fraction";
import {sendApiPostRequest} from "../../../../../lib/client/util";
import Link from "next/link";

export const getServerSideProps: GetServerSideProps = async (context) => {
  return await genNewAssignmentView(context)
}

export interface NewAssignmentProps {
  categories: ClassCategory[]
  classUuid: string
  user: ClientUser
}

export default function NewAssignment(rawProps: NewAssignmentProps | {error: number}) {
  const router = useRouter()
  const [selectedCategory, setSelectedCategory] = useState(() => {
    let category
    if (Array.isArray(router.query.categoryUuid)) {
      category = router.query.categoryUuid[0]
    } else {
      category = router.query.categoryUuid
    }
    if (!category) {
      category = props.categories[0]?.uuid
    }
    return category
  })
  const [name, setName] = useState('')
  const [maxPoints, setMaxPoints] = useState('')
  const [creating, setCreating] = useState(false)
  const [status, setStatus] = useState('')

  const props = rawProps as NewAssignmentProps
  if (typeof (rawProps as any).error !== 'undefined') {
    return <Error statusCode={(rawProps as any).error}/>
  }

  const categories = []
  for (const category of props.categories) {
    categories.push(
      <option key={category.uuid} value={category.uuid}>{category.name}</option>
    )
  }

  function onChangeName(event: ChangeEvent<HTMLInputElement>) {
    setName(event.target.value)
  }

  function onChangePoints(event: ChangeEvent<HTMLInputElement>) {
    setMaxPoints(event.target.value)
  }

  function onChangeCategory(event: ChangeEvent<HTMLSelectElement>) {
    setSelectedCategory(event.target.value)
  }

  async function onCreate() {
    setCreating(true)
    setStatus('Creating')

    try {
      const res = await sendApiPostRequest<any, {status: string, uuid: string}>(props.user, '/api/class', {
        command: 'create_assignment',
        category: selectedCategory,
        classUuid: props.classUuid,
        name,
        maxPoints: stringToMillipoint(maxPoints)!
      })

      await router.push(`/edit/classes/${props.classUuid}/assignments/${res.uuid}`)
    } catch (e) {
      setCreating(false)
      setStatus(e.toString())
    }
  }

  let valid = !creating && props.categories.length > 0
  let nameClassName = Box.Box
  if (name.length < 1) {
    nameClassName = Box.Error
    valid = false
  }
  let pointsClassName = Box.Box
  if (typeof stringToMillipoint(maxPoints) !== 'number') {
    pointsClassName = Box.Error
    valid = false
  }

  return (
    <div>
      <TopBar user={props.user}/>
      <Link href={`/edit/classes/${props.classUuid}`}>Back</Link>
      <h1>New Assignment</h1>
      <br/>
      <h3>{status}</h3>
      <br/>
      <label>Name: </label>
      <input className={nameClassName} type='text' onChange={onChangeName} value={name}/>
      <br/>
      <label>Max Points: </label>
      <input className={pointsClassName} type='text' onChange={onChangePoints} value={maxPoints}/>
      <br/>
      <label>Category</label>
      <select onChange={onChangeCategory} value={selectedCategory}>{categories}</select>
      <br/>
      <button disabled={!valid} onClick={onCreate}>Create</button>
    </div>
  )
}