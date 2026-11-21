type S={status:string;gameDate:string;audience?:'COMMUNITY_ONLY'|'PUBLIC';participantCount:number;maxParticipants:number;communityId?:number|null};
export function canOpenToPublic(s:S,canManage:boolean,now?:number):boolean;
export function canRestrictToMembers(s:S,canManage:boolean,communityId:number,now?:number):boolean;
