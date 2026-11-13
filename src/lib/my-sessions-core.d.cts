import type {MySessions,SessionSummary} from './types';
export interface MySessionsSection {title:string;items:SessionSummary[]}
export declare function organizeMySessions(data:MySessions,now?:number):{
 upcoming:MySessionsSection[];history:MySessionsSection[]
};
