import {request} from './api';

export type MessageMode='DIRECT'|'REQUEST'|'PENDING'|'RECEIVED'|'NOT_ALLOWED';
export type MessageAvailability={mode:MessageMode;reason:string|null};
export type IncomingMessageRequest={id:number;username:string;fullName:string|null;profilePicUrl:string|null;text:string;createdAt:string};
export type MessagePolicy='EVERYONE'|'FOLLOWING'|'COMMUNITIES';
const base='/api/messages/requests';
const user=(u:string)=>encodeURIComponent(u.trim());

/** Instagram-style message requests: the server decides who may write to whom. */
export const messageAvailability=(username:string,token:string)=>request<MessageAvailability>(base+'/availability/'+user(username),{token});
export const sendMessageRequest=(username:string,text:string,token:string)=>request<void>(base,{token,method:'POST',body:{username,text}});
export const incomingMessageRequests=(token:string)=>request<IncomingMessageRequest[]>(base,{token});
export const messageRequestCount=(token:string)=>request<{pending:number}>(base+'/count',{token});
export const acceptMessageRequest=(id:number,token:string)=>request<void>(base+'/'+id+'/accept',{token,method:'POST'});
export const declineMessageRequest=(id:number,token:string)=>request<void>(base+'/'+id+'/decline',{token,method:'POST'});
export const messagePolicy=(token:string)=>request<{policy:MessagePolicy}>(base+'/policy',{token});
export const setMessagePolicy=(policy:MessagePolicy,token:string)=>request<{policy:MessagePolicy}>(base+'/policy',{token,method:'PUT',body:{policy}});
