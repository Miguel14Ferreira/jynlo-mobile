import type {SessionDetail} from './types';
export interface MinimumProgress {required:number;count:number;missing:number;percent:number}
export function minimumPlayersProgress(session:SessionDetail|null):MinimumProgress|null;
export function rosterAttendanceLabel(attendanceStatus:string,sessionStatus:string):string|null;
