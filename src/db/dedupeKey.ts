import type { BehaviorEvent } from '../types/event';

export function buildDedupeKey(
  event: Pick<BehaviorEvent, 'type' | 'timestamp' | 'packageName' | 'metadata'>,
): string {
  if (event.type === 'activity_change') {
    return `${event.type}|${event.timestamp}|${event.metadata?.activity ?? ''}|${event.metadata?.detector ?? ''}`;
  }
  if (event.type === 'posture_change') {
    return `${event.type}|${event.timestamp}|${event.metadata?.posture ?? ''}`;
  }
  if (event.type === 'media_track_change') {
    return `${event.type}|${event.timestamp}|${event.packageName ?? ''}|${event.metadata?.title ?? ''}`;
  }
  if (event.type === 'service_start' || event.type === 'service_stop') {
    return `${event.type}|${event.timestamp}|${event.metadata?.phase ?? ''}`;
  }
  return `${event.type}|${event.timestamp}|${event.packageName ?? ''}`;
}
