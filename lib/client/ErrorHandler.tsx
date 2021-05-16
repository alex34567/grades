import NextError from "next/error";
import React from "react";

export interface HtmlError {
  error: number
}

export interface ErrorHandlerProps<T> {
  dispatch: React.FunctionComponent<T>,
  props: T | HtmlError
}

export default function ErrorHandler<T>(props: ErrorHandlerProps<T>) {
  if (typeof (props.props as any).error !== 'undefined') {
    return <NextError statusCode={(props.props as any).error}/>
  }

  const Dispatch = props.dispatch

  return <Dispatch {...props.props as T}/>
}