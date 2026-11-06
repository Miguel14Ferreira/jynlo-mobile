/** Contract verified against desporto24FE/develop and desporto24BE/develop, 2026-11-03. */
export type SessionStatus = 'OPEN' | 'FULL' | 'CANCELLED' | 'COMPLETED' | string;
export type JoinState = 'PARTICIPANT' | 'WAITLISTED';

export interface SessionSummary {
  id: number;
  sport: string;
  city: string;
  gameDate: string;
  distanceKm: number | null;
  participantCount: number;
  maxParticipants: number;
  priceAmount: number;
  privateGame: boolean;
  communityId?: number | null;
  seasonCommunityId?: number | null;
  audience?: 'COMMUNITY_ONLY' | 'PUBLIC';
  joinedByViewer?: boolean;
  waitlistedByViewer?: boolean;
  status: SessionStatus;
}
export interface PublicSessionPreview {
  id: number;
  sport: string | null;
  city: string | null;
  gameDate: string | null;
  participantCount: number | null;
  maxParticipants: number | null;
  priceAmount: number | null;
  status: SessionStatus | null;
  gamePhoto: string | null;
  venueName?: string | null;
  /** Public anonymous preview excludes exact address. Never infer location. */
  address?: string | null;
}
export interface SessionDetail extends SessionSummary {
  creatorUsername: string | null;
  address: string | null;
  canSeeExactAddress: boolean;
  joined: boolean;
  waitlisted: boolean;
  waitlistPosition: number | null;
  gamePhoto: string | null;
  meetingPointInstructions?: string | null;
  minParticipants?: number;
  registrationOpeningMode?: 'IMMEDIATE' | 'SCHEDULED' | 'MANUAL' | null;
  registrationOpensAt?: string | null;
}
export interface SessionParticipant {
  id: number;
  username: string;
  attendanceStatus: 'PENDING' | 'ATTENDED' | 'NO_SHOW' | 'LATE_CANCELLED';
  joinedAt: string;
  profilePicUrl?: string | null;
}
export interface JoinSessionResponse { state: JoinState; waitlistPosition: number | null; }
export interface PendingSessionInvite {
  id:number;sessionId:number;inviterUsername:string;createdAt:string;
  sport?:string|null;city?:string|null;gameDate?:string|null;
  maxParticipants?:number|null;participantCount?:number|null;
  status?:SessionStatus|null;
}
export interface LoginResponse {
  mfaRequired: boolean;
  challengeId: string | null;
  challengeExpiresAt: string | null;
  token: string | null;
  profile: { username?: string } | null;
}
export interface SessionFilters { sport?: string; city?: string; availableOnly?: boolean; }

export type CommunityVisibility = 'PUBLIC' | 'PRIVATE';
export type CommunityRole = 'OWNER' | 'ADMIN' | 'MEMBER';
export interface CommunityMember {
  profileId: number; username: string; fullName: string|null;
  profilePicUrl: string|null; role: CommunityRole;
}
export interface CommunitySummary {
  id:number; name:string; description:string|null; sport:string|null;
  sports?:string[]; photoUrl:string|null; visibility:CommunityVisibility;
}
export interface CommunityGroup extends CommunitySummary {
  rankingsEnabled:boolean; individualTournamentsEnabled?:boolean;
  teamTournamentsEnabled?:boolean; ownerUsername:string;
  myRole:CommunityRole|null; memberCount:number; createdAt:string; members:CommunityMember[];
}
export interface CommunitySearchResponse { communities:CommunitySummary[]; page:number; hasMore:boolean; }
export interface CommunityCreationQuota { owned:number;limit:number;canCreate:boolean; }
export interface CommunityInvite { id:number; communityId:number; communityName:string; invitedByUsername:string; createdAt:string; }
export interface CommunityJoinRequest {
  id:number;communityId:number;communityName:string;requesterUsername:string;
  status:'PENDING'|'ACCEPTED'|'REJECTED'|'CANCELLED';createdAt:string;
}
export interface CommunityCreateRequest {
  name:string;description:string|null;sport:string|null;
  sports?:string[];visibility:CommunityVisibility;
}

/** Contracts from Jynlo community-tournament.ts and community-timeline.service.ts, develop. */
export interface JynloTournament {
  id:number; name:string; sport?:string|null; eventType?:string|null;
  eventDiscipline?:string|null;entryType?:'INDIVIDUAL'|'TEAM';
  scoringMode?:string|null;format:'LEAGUE'|'KNOCKOUT'|'GROUP_KNOCKOUT';
  status:'DRAFT'|'IN_PROGRESS'|'COMPLETED';createdAt:string;
  championTeamName?:string|null;championDisplayName?:string|null;
}
export interface JynloTournamentPage {tournaments:JynloTournament[];page:number;hasMore:boolean;}
export interface TeamStandingRow {position:number;teamId:number;teamName:string;played:number;won:number;drawn:number;lost:number;points:number;}
export interface IndividualStandingRow {position:number;profileId:number;username:string;displayName:string;played:number;won:number;drawn:number;lost:number;points:number;}
export interface RaceStandingRow {position:number;playerId:number|null;profileId?:number|null;username?:string|null;fullName:string|null;profilePicUrl?:string|null;races:number;wins:number;podiums:number;bestFinish:number|null;championshipPoints:number|null;penaltyPoints:number;}
export interface TournamentTable {kind:'TEAM'|'INDIVIDUAL'|'CHESS';rows:TeamStandingRow[]|IndividualStandingRow[];source:string;}

/** Read-only tournament contracts from Jynlo web/BE develop. */
export interface PerformanceRound {id:number;name:string;sport:string|null;playedAt:string|null;eventType?:string|null;eventDiscipline?:string|null;entries?:unknown[];}
export interface TimedStanding {position:number;communityPlayerId:number|null;profileId:number|null;username:string|null;fullName:string|null;bestSeconds:number;validAttempts:number;}
export interface MeasuredStanding {position:number;communityPlayerId:number|null;profileId:number|null;username:string|null;fullName:string|null;bestMetres:number;validMarks:number;}
export interface TimedOverview {tournamentId:number;eventType:string|null;eventDiscipline:string|null;linkedRounds:PerformanceRound[];availableRounds:PerformanceRound[];standings:TimedStanding[];}
export interface MeasuredOverview {tournamentId:number;eventType:string|null;eventDiscipline:string|null;linkedRounds:PerformanceRound[];availableRounds:PerformanceRound[];standings:MeasuredStanding[];}
export interface RaceOverview {tournamentId:number;pointsByPlace:number[];linkedRaces:PerformanceRound[];availableRaces:PerformanceRound[];standings:RaceStandingRow[];}
export interface RelayStanding {position:number;teamId:number;teamName:string;bestSeconds:number;recordedHeats:number;runnerProfileIds:number[];}
export interface RelayFinalist {teamId:number;teamName:string;seed:number;qualifyingSeconds:number;}
export interface RelayHeat {id:number;teamId:number;teamName:string;heatNumber:number;elapsedSeconds:number;runnerProfileIds:number[];recordedAt:string;stage:string|null;decisionStatus:string|null;}
export interface RelayDecision {id:number;heatId:number;previousStatus:string;status:string;reason:string;actorProfileId:number;decidedAt:string;}
export interface RelayOverview {tournamentId:number;eventDiscipline:string|null;teams:JynloTournamentTeam[];heats:RelayHeat[];standings:RelayStanding[];finalPublished:boolean;finalists:RelayFinalist[];qualifyingStandings:RelayStanding[];finalStandings:RelayStanding[];decisions?:RelayDecision[];}
export type TournamentPerformanceOverview =
 |{kind:'RACE';data:RaceOverview}|{kind:'TIMED';data:TimedOverview}|{kind:'MEASURED';data:MeasuredOverview}|{kind:'RELAY';data:RelayOverview};
export interface TournamentIndividualMatch {id:number;roundNumber:number;homeProfileId:number;homeUsername:string;awayProfileId:number;awayUsername:string;status:'SCHEDULED'|'COMPLETED';homeScore:number|null;awayScore:number|null;}
export interface TournamentIndividualMatchPage {matches:TournamentIndividualMatch[];page:number;hasMore:boolean;}


export interface CommunityChatEntry {
  id:number;communityId:number;kind:'CHAT'|'POST';username:string;body:string;createdAt:string;
  editedAt?:string|null;deletedAt?:string|null;replyToMessageId?:number|null;
}
export interface JynloInboxSummary {kind:'direct'|'community'|'session';id:string;latestMessageId:number|null;latestText:string|null;latestSender:string|null;latestAt:string|null;unreadCount:number;}

/** Read-only notification DTO; the backend remains authoritative. */
export interface JynloNotification {
 id:number;subject:string;message:string;createdAt:string;read:boolean;
 type:string|null;communityId?:number|null;sessionId:number|null;relatedUsername?:string|null;
}
/** Matches and group standings exactly as supplied by the Jynlo team tournament backend. */
export interface TournamentTeamMatch {
 id:number;roundNumber:number;homeTeamId:number;homeTeamName:string;
 awayTeamId:number;awayTeamName:string;status:'SCHEDULED'|'COMPLETED';
 homeScore:number|null;awayScore:number|null;groupNumber?:number|null;
}
export interface TournamentTeamMatchPage {matches:TournamentTeamMatch[];page:number;hasMore:boolean;}
export interface TournamentTeamStanding {
 position:number;teamId:number;teamName:string;played:number;won:number;drawn:number;lost:number;
 goalsFor:number;goalsAgainst:number;goalDifference:number;points:number;
}
export interface TournamentTeamGroup {groupNumber:number;standings:TournamentTeamStanding[];}
export interface TournamentTeamGroups {tournamentId:number;knockoutStarted:boolean;groups:TournamentTeamGroup[];}

export interface JynloTournamentTeam {
 id:number;name:string;playersPerTeam:number|null;createdAt:string;
 players:Array<{profileId:number;username:string;displayName:string}>;
}



/** Feed contract mirrored from Jynlo Web: src/app/pages/model/feed-item.ts. */
export interface FeedItem {
  type:'POST'|'SESSION_CREATED'|'SESSION_ATTENDED';
  postId:number|null;authorUsername:string;authorDisplayName:string;
  authorProfilePicUrl:string|null;content:string|null;imageUrl:string|null;videoUrl?:string|null;
  createdAt:string;sessionId:number|null;sport:string|null;city:string|null;gameDate:string|null;
  likeCount:number;likedByMe:boolean;commentCount:number;
}
/** Reduced mobile view; all fields are server sourced, never infer GPS/address. */
export interface VenueSummary {
  id:number;name:string;city:string;district?:string|null;address:string;
  sports:string|null;venueType:string|null;latitude:number|null;longitude:number|null;
  contact?:string|null;website?:string|null;lighting:boolean;parking:boolean;
  openingHours?:string|null;priceInfo?:string|null;
  transport?:string|null;services?:string|null;surfaceType?:string|null;
  environmentType?:string|null;ownershipType?:string|null;
  indoor?:boolean|null;changingRooms?:boolean|null;toilets?:boolean|null;
  showers?:boolean|null;accessible?:boolean|null;wifi?:boolean|null;
  locationStatus?:string|null;
}
export interface VenuePhoto {id:number;photoUrl:string;uploadedByUsername?:string|null;createdAt?:string|null;}
export interface VenueSportCondition {id:number;sport:string;conditions:string;informationSource?:string|null;createdByUsername?:string|null;createdAt?:string|null;}
/** The server intentionally hides the count and mean until the privacy threshold is met. */
export interface VenueRatingSummary {venueId:number;ratingCount:number;averageScore:number|null;}
export interface VenueSuggestionPage {venues:VenueSummary[];page:number;hasMore:boolean;}
export interface MySessions {created:SessionSummary[];joined:SessionSummary[];waitlisted:SessionSummary[];}

/** Same contracts as Jynlo Web: social-story.ts + feed-item.ts. */
export interface SocialStory {
  id:number; authorUsername:string; displayName:string; avatarUrl:string|null;
  communityId:number|null;communityName:string|null;communityPhotoUrl:string|null;
  caption:string|null;mediaUrl:string;video:boolean;createdAt:string;expiresAt:string;
  canDelete:boolean;
}
export interface SocialComment {id:number;postId:number;authorUsername:string;authorDisplayName:string;authorProfilePicUrl:string|null;content:string;createdAt:string;}
export interface FeedUserSuggestion {username:string;displayName:string;photoUrl:string|null;sport?:string|null;city?:string|null;}
export interface MobileMedia {uri:string;type:'image'|'video';mimeType:string;fileName:string;fileSize:number;}
