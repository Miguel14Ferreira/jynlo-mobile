const test=require('node:test');const assert=require('node:assert');
const fs=require('node:fs');const path=require('node:path');
const {pickLanguage,translate,placeholders,localeTag}=require('../src/lib/i18n-core.cjs');
const {EN}=require('../src/lib/i18n-en.cjs');
const root=path.join(__dirname,'..');

/** Screens already translated: no visible Portuguese may be added without t(). */
const TRANSLATED=[
 'app/communities/[id]/stats.tsx',
 'app/welcome.tsx',
 'app/login.tsx',
 'app/search.tsx',
 'app/first-steps.tsx',
 'app/(tabs)/explore.tsx',
 'app/(tabs)/_layout.tsx',
 'app/(tabs)/profile.tsx',
 'app/_layout.tsx',
 'src/components/UI.tsx',
 'app/sessions/[id].tsx',
 'app/sessions/create.tsx',
 'app/(tabs)/index.tsx',
 'app/(tabs)/messages.tsx',
 'app/notifications.tsx',
 'app/my-sessions.tsx',
 'src/features/home-up-next.tsx',
 'app/+not-found.tsx',
 'app/change-password.tsx',
 'app/communities/[id].tsx',
 'app/communities/[id]/championships/[championshipId].tsx',
 'app/communities/[id]/championships/create.tsx',
 'app/communities/[id]/championships/events.tsx',
 'app/communities/[id]/championships/fixture.tsx',
 'app/communities/[id]/championships/honours.tsx',
 'app/communities/[id]/championships/teams.tsx',
 'app/communities/[id]/competitions.tsx',
 'app/communities/[id]/live/[eventId].tsx',
 'app/communities/[id]/live/index.tsx',
 'app/communities/[id]/results.tsx',
 'app/communities/create.tsx',
 'app/communities/index.tsx',
 'app/communities/invites.tsx',
 'app/confirm-email.tsx',
 'app/edit-profile.tsx',
 'app/feed-hidden.tsx',
 'app/google-onboarding.tsx',
 'app/groups/[id].tsx',
 'app/groups/index.tsx',
 'app/legal.tsx',
 'app/live/[id].tsx',
 'app/live/index.tsx',
 'app/messages/[peer].tsx',
 'app/messages/call.tsx',
 'app/mfa.tsx',
 'app/nearby-alerts.tsx',
 'app/notification-settings.tsx',
 'app/people.tsx',
 'app/posts/[postId]/index.tsx',
 'app/posts/[postId]/likers.tsx',
 'app/register.tsx',
 'app/reset-password.tsx',
 'app/security-mfa.tsx',
 'app/sessions/[id]/edit.tsx',
 'app/sessions/[id]/result.tsx',
 'app/social/[username]/[kind].tsx',
 'app/social/[username]/index.tsx',
 'app/stories/replies.tsx',
 'app/teams/[id].tsx',
 'app/teams/competitions.tsx',
 'app/teams/index.tsx',
 'app/tournaments/[communityId]/[id].tsx',
 'app/tournaments/[communityId]/[id]/events.tsx',
 'app/tournaments/[communityId]/[id]/fixtures.tsx',
 'app/tournaments/[communityId]/[id]/manage.tsx',
 'app/tournaments/[communityId]/[id]/matches.tsx',
 'app/tournaments/[communityId]/[id]/participants.tsx',
 'app/tournaments/[communityId]/[id]/provas.tsx',
 'app/tournaments/[communityId]/[id]/relays.tsx',
 'app/tournaments/[communityId]/[id]/results.tsx',
 'app/tournaments/[communityId]/[id]/teams.tsx',
 'app/tournaments/[communityId]/[id]/teams/[teamId].tsx',
 'app/tournaments/create.tsx',
 'app/tournaments/index.tsx',
 'app/venues.tsx',
 'app/venues/[id].tsx',
 'app/venues/[id]/suggest-edit.tsx',
 'app/venues/create.tsx',
 'src/components/AddToCalendarButton.tsx',
 'src/components/AttendanceHistory.tsx',
 'src/components/AvailabilityPanel.tsx',
 'src/components/BirthDatePicker.tsx',
 'src/components/CallChatSidePanel.tsx',
 'src/components/CallUpCard.tsx',
 'src/components/CallUpPicker.tsx',
 'src/components/ChatMentions.tsx',
 'src/components/ChatPdfComposer.tsx',
 'src/components/ChatReactionRow.tsx',
 'src/components/ChatReplyPreview.tsx',
 'src/components/ChatSearchPanel.tsx',
 'src/components/CloseIconButton.tsx',
 'src/components/CommunityChatPanel.tsx',
 'src/components/CommunityFeedPanel.tsx',
 'src/components/CommunityTeamsPanel.tsx',
 'src/components/CommunityUI.tsx',
 'src/components/CompetitionTeamSearch.tsx',
 'src/components/FeedVideo.tsx',
 'src/components/FriendPicker.tsx',
 'src/components/FutureExclusionSheet.tsx',
 'src/components/GlobalTeamEnrollment.tsx',
 'src/components/GuestSessionRSVP.tsx',
 'src/components/JynloIcon.tsx',
 'src/components/OfflineSessionMap.tsx',
 'src/components/PollCard.tsx',
 'src/components/PollComposer.tsx',
 'src/components/PostAlbumCarousel.tsx',
 'src/components/PostEditSheet.tsx',
 'src/components/PostGameCommunities.tsx',
 'src/components/PostImageLightbox.tsx',
 'src/components/PreviousUnpaidWarning.tsx',
 'src/components/ProfilePosts.tsx',
 'src/components/ProfilePrivacySettings.tsx',
 'src/components/ProtectedPostMedia.tsx',
 'src/components/PublicShareCard.tsx',
 'src/components/ReportSheet.tsx',
 'src/components/SecureChatAttachment.tsx',
 'src/components/SessionChatPanel.tsx',
 'src/components/SessionDraftLocationMap.tsx',
 'src/components/SessionLocationPanel.tsx',
 'src/components/SessionMemoriesPanel.tsx',
 'src/components/SessionNativeMap.tsx',
 'src/components/SessionOfficialResultCard.tsx',
 'src/components/SessionPaymentsPanel.tsx',
 'src/components/SocialPeopleList.tsx',
 'src/components/SportsTeamChallengesPanel.tsx',
 'src/components/SportsTeamContentPanel.tsx',
 'src/components/StoryCameraCapture.tsx',
 'src/components/StoryDetailsView.tsx',
 'src/components/TeamBrandAvatar.tsx',
 'src/components/TeamCompetitionApplications.tsx',
 'src/components/TeamCrestStudio.tsx',
 'src/components/TeamKitPreview.tsx',
 'src/components/TeamKitStudio.tsx',
 'src/components/TournamentMatchUI.tsx',
 'src/features/direct-call-screen.tsx',
];

test('language: saved choice, else the phone language',()=>{
 assert.strictEqual(pickLanguage('en','pt-PT'),'en');
 assert.strictEqual(pickLanguage(null,'pt-BR'),'pt');
 assert.strictEqual(pickLanguage(null,'en-US'),'en');
 assert.strictEqual(pickLanguage(null,'es-ES'),'en');
 assert.strictEqual(pickLanguage('xx',null),'pt');
 assert.strictEqual(localeTag('en'),'en-GB');
});

test('translate falls back to Portuguese and fills placeholders',()=>{
 const d={'Olá {name}':'Hello {name}'};
 assert.strictEqual(translate(d,'en','Olá {name}',{name:'Ana'}),'Hello Ana');
 assert.strictEqual(translate(d,'pt','Olá {name}',{name:'Ana'}),'Olá Ana');
 assert.strictEqual(translate(d,'en','Sem tradução'),'Sem tradução');
 assert.strictEqual(translate(d,'en','{x} fica',{}),'{x} fica');
 assert.strictEqual(translate({'c::Olá':'Hey'},'en','c::Olá'),'Hey');
 assert.strictEqual(translate({'Olá {name}':'Hello {name}'},'en','c::Olá {name}',{name:'Rui'}),'Hello Rui');
 assert.strictEqual(translate({},'pt','c::Olá'),'Olá');
});

function sources(){
 const out=[];const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){
  const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(/\.(tsx?|cjs)$/.test(e.name)&&!e.name.startsWith('i18n-en'))out.push(fs.readFileSync(p,'utf8'));}};
 walk(path.join(root,'app'));walk(path.join(root,'src'));return out.join('\n');
}

test('every English entry is used, complete and keeps the placeholders',()=>{
 const code=sources();
 for(const [pt,en] of Object.entries(EN)){
  const quoted=["'"+pt.replace(/'/g,"\\'")+"'",'"'+pt+'"'];
  assert.ok(quoted.some(q=>code.includes(q)),'unused entry: '+pt);
  assert.ok(en.trim(),'empty: '+pt);
  assert.deepStrictEqual(placeholders(en),placeholders(pt),'placeholders: '+pt);
  assert.ok(!/[ãõçê]/.test(en.replace(/André/g,'')),'Portuguese left in English: '+en);
 }
});

test('translated screens: every t() text has an English entry, and no visible Portuguese is left out',()=>{
 const missing=[],loose=[];
 for(const f of TRANSLATED){
  const s=fs.readFileSync(path.join(root,f),'utf8');
  for(const m of s.matchAll(/(?<![\w.$])tr?\('((?:[^'\\]|\\.)*)'/g)){const k=m[1].replace(/\\'/g,"'");if(!(k in EN))missing.push(f+': '+k);}
  for(const m of s.matchAll(/>([^<>{}()=;&|\n]*[A-Za-zÀ-ÿ]{3,} [^<>{}()=;&|\n]*)</g))loose.push(f+': '+m[1].trim());
  for(const m of s.matchAll(/(title|placeholder|accessibilityLabel|subtitle|eyebrow|label|caption|hint)="([^"]*[a-zà-ÿ][^"]*)"/g))loose.push(f+': '+m[2]);
  // Portuguese words inside `template ${strings}` are invisible to t().
  for(const m of s.matchAll(/`([^`]*)`/g)){let plain=m[1];for(let i=0;i<6;i++)plain=plain.replace(/\{[^{}]*\}/g,'');plain=plain.replace(/\$/g,'');if(/[a-zà-ÿ]{3,} [a-zà-ÿ]{2,}/.test(plain))loose.push(f+': `'+m[1].slice(0,60));}
 }
 assert.deepStrictEqual(missing,[]);
 assert.deepStrictEqual(loose,[]);
});
