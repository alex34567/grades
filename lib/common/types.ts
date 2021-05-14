import MOCK_STUDENT from '../mockStudent.json'

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

export enum UserType {
  admin,
  professor,
  student,
}

function typeCheckMock(_student: Student) {}
typeCheckMock(MOCK_STUDENT);
