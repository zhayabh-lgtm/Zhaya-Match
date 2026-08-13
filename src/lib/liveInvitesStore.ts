import type { LiveInvite, PublicLiveInvite } from '../types/zhaya.js';

// Shared in-memory store fallback when Supabase table does not exist or schema cache is refreshing
const inMemoryLiveInvites: Map<string, LiveInvite> = new Map();

export const LiveInvitesStore = {
  getAll(): LiveInvite[] {
    return Array.from(inMemoryLiveInvites.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  getBySlug(slug: string): LiveInvite | null {
    if (!slug) return null;
    const clean = slug.trim().toLowerCase();
    for (const item of inMemoryLiveInvites.values()) {
      if (item.slug.toLowerCase() === clean) {
        return item;
      }
    }
    return null;
  },

  getPublicBySlug(slug: string): PublicLiveInvite | null {
    const item = this.getBySlug(slug);
    if (!item) return null;
    if (!item.active) {
      return {
        title: item.title,
        description: item.description || null,
        startsAt: item.startsAt,
        endsAt: item.endsAt,
        timezone: item.timezone || 'America/Sao_Paulo',
        status: 'not_found',
      };
    }

    const now = new Date();
    const endDate = new Date(item.endsAt);
    const isEnded = !isNaN(endDate.getTime()) && endDate.getTime() < now.getTime();

    return {
      title: item.title,
      description: item.description || null,
      startsAt: item.startsAt,
      endsAt: item.endsAt,
      timezone: item.timezone || 'America/Sao_Paulo',
      status: isEnded ? 'ended' : 'active',
    };
  },

  save(invite: LiveInvite): void {
    inMemoryLiveInvites.set(invite.id, invite);
  },

  delete(id: string): boolean {
    return inMemoryLiveInvites.delete(id);
  },

  isTableMissingError(error: any): boolean {
    if (!error) return false;
    const message = (error.message || '').toLowerCase();
    const details = (error.details || '').toLowerCase();
    const hint = (error.hint || '').toLowerCase();
    const code = error.code || '';

    return (
      code === '42P01' || // relation does not exist
      code === 'PGRST204' || // schema cache miss
      code === 'PGRST200' ||
      message.includes('live_invites') ||
      message.includes('schema cache') ||
      message.includes('relation "public.live_invites" does not exist') ||
      message.includes('could not find the table') ||
      details.includes('live_invites') ||
      hint.includes('live_invites')
    );
  },
};
