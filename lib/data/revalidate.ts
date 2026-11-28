import 'server-only'

import { revalidatePath as revalidateNextPath, revalidateTag } from 'next/cache'

/** Tag of every cached public read (lib/data/public.ts). */
export const PUBLIC_DATA_TAG = 'public-data'

/** The next visitor gets fresh public data (no stale copy is served). */
export function revalidatePublicData() {
  revalidateTag(PUBLIC_DATA_TAG, { expire: 0 })
}

/**
 * Same as Next's revalidatePath, and also refreshes the public data cache:
 * a staff change (score, composition, stats, schedule) is visible at once.
 */
export function revalidatePath(path: string) {
  revalidateNextPath(path)
  revalidatePublicData()
}
