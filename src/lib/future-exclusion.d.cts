export type ExclusionReason='NO_SHOW'|'UNSPORTING_CONDUCT'|'DISRESPECTFUL_BEHAVIOUR'|'ABUSIVE_BEHAVIOUR'|'OTHER';
export const REASONS:{id:ExclusionReason;label:string}[];
export function reasonsFor(attendanceStatus:string|null|undefined):{id:ExclusionReason;label:string}[];
export function canManage(viewer:string|null|undefined,creator:string|null|undefined,participantUsername:string|null|undefined):boolean;
