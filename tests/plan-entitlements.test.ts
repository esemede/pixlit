import { describe, expect, it } from 'vitest';
import {
  PLANS,
  getAnonymousEntitlements,
  getPlanEntitlements,
  canCreateNotebook,
  canFitStorage,
  storageLimitLabel,
} from '../lib/plans';

describe('Pixlit notebook plan entitlements', () => {
  it('keeps anonymous users browser-local and unable to use web sharing', () => {
    const entitlements = getAnonymousEntitlements();

    expect(entitlements.localOnly).toBe(true);
    expect(entitlements.canUseServerStorage).toBe(false);
    expect(entitlements.canShareViaWeb).toBe(false);
  });

  it('allows logged-in free users up to 5 server notes with a finite storage cap', () => {
    const free = getPlanEntitlements('free');

    expect(free.localOnly).toBe(false);
    expect(free.canUseServerStorage).toBe(true);
    expect(free.maxNotebooks).toBe(5);
    expect(free.maxStorageBytes).toBeGreaterThan(0);
    expect(free.canShareViaWeb).toBe(true);
    expect(canCreateNotebook('free', 4)).toBe(true);
    expect(canCreateNotebook('free', 5)).toBe(false);
  });

  it('makes the Premium plan unlimited by note count but bounded by agreed storage', () => {
    const premium = getPlanEntitlements('starter');

    expect(PLANS.starter.name).toBe('Premium');
    expect(premium.maxNotebooks).toBe(-1);
    expect(premium.maxStorageBytes).toBeGreaterThan(PLANS.free.maxStorageBytes);
    expect(canCreateNotebook('starter', 5000)).toBe(true);
    expect(canFitStorage('starter', premium.maxStorageBytes - 1, 1)).toBe(true);
    expect(canFitStorage('starter', premium.maxStorageBytes, 1)).toBe(false);
  });

  it('formats storage limits for account and pricing surfaces', () => {
    expect(storageLimitLabel('free')).toMatch(/MB|GB/);
    expect(storageLimitLabel('starter')).toMatch(/MB|GB/);
  });
});
