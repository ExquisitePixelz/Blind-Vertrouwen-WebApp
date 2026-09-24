// Remembers the last campaign opened on this device, so the header's Piety
// link knows where to go. A per-device convenience only: if storage is
// blocked or empty, the link simply goes to the campaign list.

const KEY = 'theros:lastCampaign'

export function rememberCampaign(campaignId: string) {
  try {
    localStorage.setItem(KEY, campaignId)
  } catch {
    // ignore
  }
}

export function lastCampaign(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}
