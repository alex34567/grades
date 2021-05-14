export interface Fraction {
  n: number,
  d: number
}

export interface Class {
  name: string,
  professor: string,
  id: number,
  grade: Fraction,
  categories: ClassCategory[],
}

export interface ClassCategory {
  name: string,
  id: number,
  grade: Fraction,
  assignments: Assignment[],
}

export interface Assignment {
  name: string,
  id: number,
  grade: Fraction,
}

export interface Student {
  name: string,
  gpa: number,
  classes: Class[],
}

export interface ClientUser {
  name: string,
  type: UserType
  uuid: string
  csrf: string
  error?: undefined
}

export enum UserType {
  admin,
  professor,
  student,
}
