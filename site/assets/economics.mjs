// BotRampart request economics: the reference implementation of the proposed algorithm
// (architecture plan section 10.4). The home page simulation, the signup preview and the
// repository's tests all use this one file. Numbers are the proposed defaults, not measurements.

export const DEFAULT_POLICY = Object.freeze({
  path_classes: {
    static: { cost: 0, min_tier: 0 },
    general: { cost: 1, min_tier: 0 },
    search: { cost: 5, min_tier: 1 },
    login: { cost: 10, min_tier: 1 },
    checkout: { cost: 20, min_tier: 1 },
  },
  budget: {
    refill_per_min: 20, // cost units a session regains each minute (tier 1 and up)
    burst: 300, // refill never takes the balance above this
    provisional: 30, // tier 0 allowance, general paths only
    grants: { pow: 300, human: 3000, step_up: 6000 },
    grant_decay: 0.5, // each repeat pass of a tier within 24 h buys half the previous one
    min_grant: 100, // below this a repeat pass is not offered: the session is throttled instead
    identified_multiplier: 3, // refill multiplier for sessions with a login ID attached
  },
  // Tiers the deployment can serve. Tier 3 (step_up) is planned after the first build.
  tiers: ["pow", "human"],
});

const TIER_NUMBER = { pow: 1, human: 2, step_up: 3 };
const DAY_MS = 24 * 60 * 60 * 1000;

export function newSession(now, policy = DEFAULT_POLICY) {
  return { tier: 0, credits: policy.budget.provisional, last: now, passes: { pow: [], human: [], step_up: [] }, identified: false };
}

function refill(s, now, policy) {
  if (s.tier >= 1 && s.credits < policy.budget.burst) {
    const rate = policy.budget.refill_per_min * (s.identified ? policy.budget.identified_multiplier : 1);
    s.credits = Math.min(policy.budget.burst, s.credits + (rate * (now - s.last)) / 60000);
  }
  s.last = now;
}

/** The grant a pass of `tier` would buy now, after decay for earlier passes in the last 24 h. */
export function nextGrant(s, tier, now, policy = DEFAULT_POLICY) {
  const n = s.passes[tier].filter((t) => now - t < DAY_MS).length;
  return policy.budget.grants[tier] * policy.budget.grant_decay ** n;
}

/** Which challenge to ask for when the session cannot pay, or null to throttle. */
export function nextChallenge(s, now, policy = DEFAULT_POLICY) {
  if (s.tier < 1) return "pow";
  for (const tier of policy.tiers) {
    if (tier === "pow") continue;
    if (nextGrant(s, tier, now, policy) >= policy.budget.min_grant) return tier;
  }
  return null;
}

/**
 * Charge one request. Returns { action, cost, credits, challenge? }.
 * action: "allow" | "challenge" | "throttle".
 */
export function charge(s, pathClass, now, policy = DEFAULT_POLICY) {
  refill(s, now, policy);
  const pc = policy.path_classes[pathClass] ?? policy.path_classes.general;
  if (s.tier < pc.min_tier) return { action: "challenge", challenge: "pow", cost: pc.cost, credits: s.credits };
  if (s.credits >= pc.cost) {
    s.credits -= pc.cost;
    return { action: "allow", cost: pc.cost, credits: s.credits };
  }
  const challenge = nextChallenge(s, now, policy);
  return challenge
    ? { action: "challenge", challenge, cost: pc.cost, credits: s.credits }
    : { action: "throttle", cost: pc.cost, credits: s.credits };
}

/** Record a passed challenge and grant its credit. Returns the grant. */
export function pass(s, tier, now, policy = DEFAULT_POLICY) {
  refill(s, now, policy);
  const grant = nextGrant(s, tier, now, policy);
  s.passes[tier].push(now);
  s.credits += grant;
  s.tier = Math.max(s.tier, TIER_NUMBER[tier]);
  return grant;
}

/**
 * Most cost units one session can spend in 24 hours: a full day of refill, the burst, and every
 * grant of every tier the deployment serves until the decayed grant falls below min_grant.
 */
export function dailyCeiling(policy = DEFAULT_POLICY, { identified = false } = {}) {
  const b = policy.budget;
  let total = b.refill_per_min * (identified ? b.identified_multiplier : 1) * 24 * 60 + b.burst;
  for (const tier of policy.tiers) {
    for (let g = b.grants[tier]; g >= b.min_grant; g *= b.grant_decay) total += g;
  }
  return Math.round(total);
}
