'use strict';
/** A mention is a username token, never HTML and never a membership grant. */
const validName=/^[A-Za-z0-9_.-]{2,45}$/;
const mentionTerm=(text)=>{
  const match=/(?:^|\s)@([A-Za-z0-9_.-]{3,45})$/.exec(text||'');
  return match?match[1]:null;
};
function insertMention(text,username){
  if(!validName.test(username))return text;
  return (text||'').replace(/@([A-Za-z0-9_.-]{3,45})$/,'@'+username)+' ';
}
function splitMentions(text){
  const value=typeof text==='string'?text:'';
  const result=[];let position=0;
  const regex=/(^|\s)(@[A-Za-z0-9_.-]{2,45})/g;
  let match;
  while((match=regex.exec(value))!==null){
    const start=match.index+match[1].length;
    if(start>position)result.push({text:value.slice(position,start),username:null});
    result.push({text:match[2],username:match[2].slice(1)});
    position=start+match[2].length;
  }
  if(position<value.length)result.push({text:value.slice(position),username:null});
  return result.length?result:[{text:value,username:null}];
}
module.exports={mentionTerm,insertMention,splitMentions};
