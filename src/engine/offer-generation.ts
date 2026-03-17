const OFFER_PROBABILITY = 0.6;

export function rollOfferChance(randomFn: () => number = Math.random): boolean {
  return randomFn() < OFFER_PROBABILITY;
}
