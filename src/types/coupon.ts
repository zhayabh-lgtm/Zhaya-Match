export type CouponUnlockMode = 'immediate' | 'countdown' | 'video';

export interface CouponCampaign {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  eyebrow: string | null;
  title: string;
  subtitle: string | null;
  logoUrl: string | null;
  backgroundColor: string;
  backgroundImageUrl: string | null;
  backgroundVideoUrl: string | null;
  backgroundOverlay: number;
  backgroundBlur: number;
  textColor: string;
  mutedTextColor: string;
  accentColor: string;
  buttonBackgroundColor: string;
  buttonTextColor: string;
  couponCode?: string;
  unlockMode: CouponUnlockMode;
  unlockDelaySeconds: number;
  unlockVideoUrl: string | null;
  unlockVideoMinPercent: number;
  unlockButtonText: string;
  waitingText: string | null;
  successTitle: string | null;
  successMessage: string | null;
  copyButtonText: string;
  copiedText: string;
  siteCtaEnabled: boolean;
  siteCtaText: string;
  siteUrl: string | null;
  scheduleEnabled: boolean;
  unlockStartsAt: string | null;
  unlockEndsAt: string | null;
  timerEnabled: boolean;
  timerLabel: string;
  timerLooping: boolean;
  timerDurationMinutes: number | null;
  timerEndAt: string | null;
  maxUnlocks: number | null;
  showRemaining: boolean;
  showMaxUnlocks: boolean;
  remainingUnlocks?: number | null;
  totalUnlocks?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PublicCouponCampaign extends Omit<CouponCampaign, 'couponCode'> {
  status: 'scheduled' | 'available' | 'expired' | 'depleted';
  serverNow: string;
}

export interface CouponHourlyMetric {
  hour: number;
  visitors: number;
  unlocks: number;
  copies: number;
  siteClicks: number;
}

export interface CouponLocationMetric {
  countryCode: string | null;
  region: string | null;
  city: string | null;
  count: number;
  unlocks: number;
  copies: number;
  siteClicks: number;
}

export interface CouponReferrerMetric {
  referrer: string;
  count: number;
}

export interface CouponDeviceMetric {
  deviceType: string;
  count: number;
}

export interface CouponRecentEvent {
  eventType: string;
  createdAt: string;
  city: string | null;
  region: string | null;
  countryCode: string | null;
}

export interface CouponAnalyticsSummary {
  campaignId: string;
  pageViews: number;
  uniqueVisitors: number;
  unlockClicks: number;
  unlocked: number;
  copies: number;
  siteClicks: number;
  videoStarts: number;
  videoCompleted: number;
  unlockRate: number;
  copyRate: number;
  siteClickRate: number;
  clickToUnlockRate: number;
  averageEngagementSeconds: number;
  medianEngagementSeconds: number;
  totalEngagementSeconds: number;
  devices: CouponDeviceMetric[];
  hourlyVisitors: CouponHourlyMetric[];
  locations: CouponLocationMetric[];
  referrers: CouponReferrerMetric[];
  recentEvents: CouponRecentEvent[];
  desktopIgnored: boolean;
  engagementConfigured: boolean;
}
