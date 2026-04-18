import { JobAttributesData } from 'agenda'

export type JobData<T> = T & JobAttributesData

export interface SendPrintJobProcessorPayload {
  jobId: string
}