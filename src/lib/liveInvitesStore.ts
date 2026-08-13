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
      platform: item.platform || 'instagram',
      platformUrl: item.platformUrl || 'https://instagram.com/shoes.zhaya',
      startsAt: item.startsAt,
      endsAt: item.endsAt,
      timezone: item.timezone || 'America/Sao_Paulo',
      status: isEnded ? 'ended' : 'active',
    };
  },

  save(invite: LiveInvite): void {
    const existing = inMemoryLiveInvites.get(invite.id);
    inMemoryLiveInvites.set(invite.id, {
      ...invite,
      platform: invite.platform || existing?.platform || 'instagram',
      platformUrl: invite.platformUrl !== undefined ? invite.platformUrl : existing?.platformUrl || 'https://instagram.com/shoes.zhaya',
      clicks: invite.clicks ?? existing?.clicks ?? 0,
    });
  },

  incrementClicks(slug: string): number {
    if (!slug) return 0;
    const clean = slug.trim().toLowerCase();
    for (const [id, item] of inMemoryLiveInvites.entries()) {
      if (item.slug.toLowerCase() === clean) {
        const newCount = (item.clicks || 0) + 1;
        inMemoryLiveInvites.set(id, {
          ...item,
          clicks: newCount,
        });
        return newCount;
      }
    }
    return 0;
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
