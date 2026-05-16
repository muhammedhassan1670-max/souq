import { supabase } from '@/lib/supabase';

type SupabaseClient = NonNullable<typeof supabase>;
type RealtimeChannel = ReturnType<SupabaseClient['channel']>;

type RealtimeSubscription = {
  channel: RealtimeChannel;
  listeners: Set<() => void>;
  topic: string;
};

const subscriptions = new Map<string, RealtimeSubscription>();
let channelSequence = 0;

export function subscribeToTableChanges(channelName: string, tables: string[], onChange: () => void) {
  if (!supabase || tables.length === 0) return () => undefined;

  const existing = subscriptions.get(channelName);
  if (existing) {
    existing.listeners.add(onChange);
    return () => removeRealtimeListener(channelName, onChange);
  }

  const listeners = new Set<() => void>([onChange]);
  const notifyListeners = () => {
    listeners.forEach((listener) => {
      try {
        listener();
      } catch (error) {
        console.warn(`Realtime callback failed for ${channelName}`, error);
      }
    });
  };

  const topic = `${channelName}-${Date.now()}-${channelSequence += 1}`;

  try {
    let channel = supabase.channel(topic);
    tables.forEach((table) => {
      channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, notifyListeners);
    });

    const subscribedChannel = channel.subscribe((status, error) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        console.warn(`Realtime subscription ${topic} reported ${status}`, error);
      }
    });

    subscriptions.set(channelName, {
      channel: subscribedChannel,
      listeners,
      topic,
    });
  } catch (error) {
    console.warn(`Realtime subscription failed for ${channelName}`, error);
    return () => undefined;
  }

  return () => removeRealtimeListener(channelName, onChange);
}

function removeRealtimeListener(channelName: string, onChange: () => void) {
  const entry = subscriptions.get(channelName);
  if (!entry) return;

  entry.listeners.delete(onChange);
  if (entry.listeners.size > 0) return;

  subscriptions.delete(channelName);
  if (!supabase) return;

  void supabase.removeChannel(entry.channel).catch((error: unknown) => {
    console.warn(`Realtime cleanup failed for ${entry.topic}`, error);
  });
}
