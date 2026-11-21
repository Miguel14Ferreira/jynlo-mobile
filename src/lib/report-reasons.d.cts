export type ReportReasonId='SPAM'|'HARASSMENT'|'EXPLICIT'|'FALSE'|'OTHER';
export const REPORT_REASONS:readonly {id:ReportReasonId;label:string}[];
export function composeReportReason(reasonId:ReportReasonId|null,details:string):string;
