export function normalizeInstant(v:unknown):string;
export function reconnectDelay(n:number):number;
export function parseCommunityEnvelope(v:unknown,authenticated:boolean,expectedId:number):import('./types').CommunityChatEntry|null;
export function mergeMessages(oldList:import('./types').CommunityChatEntry[],newList:import('./types').CommunityChatEntry[]):import('./types').CommunityChatEntry[];
export function safePositiveId(id:unknown):number;
export function teamInviteUrl(origin:string,communityId:number,tournamentId:number,teamId:number):string;
