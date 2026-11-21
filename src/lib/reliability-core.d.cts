export type AttendanceStatus='PENDING'|'ATTENDED'|'NO_SHOW'|'LATE_CANCELLED';
export type DisputeStatus='OPEN'|'ACCEPTED'|'REJECTED';
export interface AttendanceHistoryItem{participantId:number;sessionId:number;sport:string;city:string;gameDate:string;
 attendanceStatus:AttendanceStatus;attendanceRecordedAt:string|null;disputeStatus:DisputeStatus|null;canDispute:boolean;}
export interface ReliabilitySummary{attendanceRate:number;completedSessions:number;noShows:number;lateCancellations:number;
 penaltyScore:number;warning:boolean;reducedPriority:boolean;joinRestricted:boolean;}
export const MAX_REASON:number;
export function attendanceLabel(status:AttendanceStatus|string|null|undefined):string;
export function disputeLabel(status:DisputeStatus|string|null|undefined):string|null;
export function externalHistory(items:AttendanceHistoryItem[]|null|undefined,ownedSessionIds:number[]):AttendanceHistoryItem[];
export function validateDisputeReason(reason:string):string;
export function markDisputed(items:AttendanceHistoryItem[],participantId:number):AttendanceHistoryItem[];
export function formatRate(rate:number|null|undefined):string;
