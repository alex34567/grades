export interface Fraction {
  n: number,
  d: number
}

export interface ClientClass {
  uuid: string,
  name: string,
  student_name: string,
  professor_name: string,
  grade: Fraction,
  categories: ClientClassCategory[],
}

export interface ClientClassCategory {
  name: string,
  uuid: string,
  grade: Fraction,
  weighted_grade: Fraction,
  assignments: ClientAssignment[],
}

export interface ClientAssignment {
  name: string,
  uuid: string,
  grade: Fraction,
  weighted_grade: Fraction,
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

export interface ClassOverview {
  class_uuid: string
  professor_name: string
  name: string
  grade: Fraction
}

