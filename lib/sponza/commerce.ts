export const FULL_KIT_PRICE_CENTS = 2900;
export const REFRESH_KIT_PRICE_CENTS = 1900;
export const REFRESH_WINDOW_DAYS = 90;
export const REFRESH_WINDOW_MS = REFRESH_WINDOW_DAYS * 24 * 60 * 60 * 1000;
export const NANO_PAYMENT_LINK = "https://buy.stripe.com/7sYfZielSbL9eP878DeP33I";

export type PurchaseType = "full_kit" | "refresh";

export function getPurchaseType(refreshSourceKitId: number | null) {
  return refreshSourceKitId ? "refresh" : "full_kit";
}

export function getPurchasePriceCents(refreshSourceKitId: number | null) {
  return refreshSourceKitId ? REFRESH_KIT_PRICE_CENTS : FULL_KIT_PRICE_CENTS;
}

export function getRefreshAvailableAt(createdAt: string) {
  return new Date(new Date(createdAt).getTime() + REFRESH_WINDOW_MS).toISOString();
}

export function isRefreshEligible(createdAt: string) {
  return Date.now() >= new Date(createdAt).getTime() + REFRESH_WINDOW_MS;
}
