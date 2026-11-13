import type {SessionParticipant,SessionDetail} from './types';
export declare function confirmedSessionTeams(participants:SessionParticipant[]):{
 A:SessionParticipant[];
 B:SessionParticipant[];
 unassigned:SessionParticipant[];
};
export declare function sessionParticipationLabel(session:(Pick<SessionDetail,'status'|'joined'|'waitlisted'> & {gameDate?:string|null})|null,at?:number):string;
