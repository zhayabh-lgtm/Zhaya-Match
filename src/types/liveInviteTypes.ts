import { LiveInvite, PublicLiveInvite } from '../types/zhaya';

export interface LiveInvitesResponse {
  invites: LiveInvite[];
  tableConfigured?: boolean;
  storageMode?: 'supabase' | 'in_memory';
  note?: string;
}
