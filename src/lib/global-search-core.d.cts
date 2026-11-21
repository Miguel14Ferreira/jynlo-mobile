export function sessionFilters(query:string,sports:readonly string[]):{sport?:string;city?:string}|null;
export function cleanQuery(query:string):string;
export function sections<T extends Record<string,unknown[]>>(results:T,limit?:number):{sections:{[K in keyof T]:T[K]};total:number};
