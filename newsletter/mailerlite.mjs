// Sending one email to one person, through MailerLite.
//
// MailerLite has no transactional endpoint — its API sends campaigns, to groups
// or segments, and nothing else. (Their answer to transactional mail is a
// separate product, MailerSend: separate account, separate domain verification,
// separate DNS records at IONOS, and a third data processor in the privacy
// policy.) So a one-off send is built out of what the campaign API does have:
//
//   1. create a throwaway group named `welcome-<timestamp>-<random>`
//   2. put the one subscriber in it
//   3. create a campaign targeting that group and schedule it instantly
//   4. leave the group behind; the NEXT send deletes the stale ones
//
// The group is per-send and never shared. A single reusable "outbox" group
// would be smaller code and a real bug: campaigns resolve their recipients when
// the send starts, so a second subscriber arriving in that window receives the
// first one's email too.
//
// Step 4 is deliberate. Deleting the group immediately after scheduling races
// the send that is still resolving it, and MailerLite gives no "sent" callback
// to wait for. Cleaning up on the next run costs one extra API call, cannot
// race anything, and self-heals if a run dies halfway.
//
// What this buys over a transactional provider: it uses the API key, the
// verified sender and the DNS records that already exist, so there is nothing
// to set up and no new processor. What it costs: delivery is campaign-speed
// (minutes, not seconds), and the MailerLite dashboard collects one campaign
// per subscriber. Both are acceptable at this volume; neither is hidden.

const API = 'https://connect.mailerlite.com/api'

/** The verified sender. Must stay a sender MailerLite has verified for the domain. */
export const FROM = 'info@bandincc.it'
export const FROM_NAME = 'BandiNCC'

const GROUP_PREFIX = 'welcome-'

/** Stale throwaway groups are deleted after this long. Comfortably past any send. */
const GROUP_TTL_MS = 24 * 60 * 60 * 1000

/**
 * A caller for the MailerLite API. Both senders build one of these — the Worker
 * from its secret, the backfill script from the environment — so nothing in
 * here needs to know where the key came from.
 */
export const mailerliteClient = (key) => async (path, { method = 'POST', body } = {}) => {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${await res.text()}`)

  // DELETE answers 204 with no body.
  return res.status === 204 ? null : res.json()
}

/**
 * The Italian campaign language, resolved by shortcode rather than hardcoded so
 * the unsubscribe and preference pages stay Italian even if MailerLite
 * renumbers its language ids. Returns null rather than throwing: a wrong
 * language on those pages is not worth losing the email over.
 */
export const italianLanguageId = async (call) => {
  try {
    const languages = await call('/campaigns/languages', { method: 'GET' })
    const italian = (languages.data ?? languages).find((l) => l.shortcode === 'it')
    return italian ? Number(italian.id) : null
  } catch {
    return null
  }
}

/** The subscriber's MailerLite id, which the group assignment needs. */
export const subscriberId = async (call, email) => {
  const { data } = await call(`/subscribers/${encodeURIComponent(email)}`, { method: 'GET' })
  return data.id
}

/**
 * Deletes throwaway groups from earlier sends. The timestamp is read back out
 * of the name, so this depends on nothing MailerLite might not return.
 *
 * Never throws: cleanup failing is untidy, not broken, and it must not be able
 * to stop the email that follows it.
 */
export const cleanupWelcomeGroups = async (call, now = Date.now()) => {
  try {
    const { data } = await call(`/groups?filter[name]=${GROUP_PREFIX}&limit=100`, { method: 'GET' })

    for (const group of data ?? []) {
      const stamp = Number(String(group.name).split('-')[1])
      if (!Number.isFinite(stamp) || now - stamp < GROUP_TTL_MS) continue
      await call(`/groups/${group.id}`, { method: 'DELETE' })
    }
  } catch (err) {
    console.warn(`Could not clean up old ${GROUP_PREFIX}* groups: ${err.message}`)
  }
}

/**
 * Sends one email to one subscriber. Returns the campaign id.
 *
 * `email` must already exist as a subscriber — for the welcome email that is
 * guaranteed, because the entitlement grant creates them moments earlier.
 */
export const sendOneOff = async (
  call,
  { email, subject, html, languageId, namePrefix = '', now = Date.now() }
) => {
  const id = await subscriberId(call, email)

  const name = `${GROUP_PREFIX}${now}-${Math.random().toString(36).slice(2, 8)}`
  const { data: group } = await call('/groups', { body: { name } })

  await call(`/subscribers/${id}/groups/${group.id}`)

  const { data: campaign } = await call('/campaigns', {
    body: {
      // Shown in the dashboard. `namePrefix` is how a staging send is
      // recognisable there — both Workers share one MailerLite account. The
      // address is deliberately not in the name: the group id is enough to
      // trace one, and campaign names are visible in more places than a
      // subscriber record is.
      name: `${namePrefix}Benvenuto — ${new Date(now).toISOString().slice(0, 10)} — ${group.id}`,
      type: 'regular',
      ...(languageId ? { language_id: languageId } : {}),
      groups: [String(group.id)],
      emails: [{ subject, from_name: FROM_NAME, from: FROM, content: html }],
    },
  })

  await call(`/campaigns/${campaign.id}/schedule`, { body: { delivery: 'instant' } })

  return campaign.id
}
