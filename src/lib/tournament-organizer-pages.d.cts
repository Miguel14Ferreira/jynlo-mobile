export interface OrganizerFixturePage<T extends {id:number}> {matches:T[];page:number;hasMore:boolean;}
export function reconcileVisibleFixtures<T extends {id:number}>(
 fetchPage:(page:number)=>Promise<OrganizerFixturePage<T>>,
 previousPage:number,
 isCurrent:()=>boolean,
 maxPages?:number
):Promise<OrganizerFixturePage<T>|null>;
export function validateNextFixturePage<T extends {id:number}>(response:OrganizerFixturePage<T>,expectedPage:number):OrganizerFixturePage<T>;
