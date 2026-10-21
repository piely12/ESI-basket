export function isMatchLockedByTime(scheduledAt: string, status: string): boolean {
  return new Date(scheduledAt).getTime() <= Date.now() || ['en_cours', 'termine'].includes(status)
}
