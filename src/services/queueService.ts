import { supabase } from '../utils/supabase';

export interface QueueItem {
  id: string;
  value1: string;
  value2: string;
  created_at: string;
  position: number;
}

// Fetch all queue items in order
export async function getQueue(): Promise<QueueItem[]> {
  const { data, error } = await supabase
    .from('queue_items')
    .select('*')
    .order('position', { ascending: true });

  if (error) {
    console.error('Error fetching queue:', error);
    return [];
  }
  return data || [];
}

// Add a new item to the queue
export async function pushToQueue(value1: string, value2: string): Promise<QueueItem[]> {
  // Get the current highest position
  const { data: positions } = await supabase
    .from('queue_items')
    .select('position')
    .order('position', { ascending: false })
    .limit(1);
  
  const newPosition = positions && positions.length > 0 ? positions[0].position + 1 : 0;
  
  const { error } = await supabase
    .from('queue_items')
    .insert([{ value1, value2, position: newPosition }]);

  if (error) {
    console.error('Error adding to queue:', error);
    throw error;
  }
  
  // Fetch and return the updated queue immediately
  return getQueue();
}

// Remove the first item from the queue
export async function popFromQueue(): Promise<QueueItem[]> {
  // Get the first item
  const { data: firstItem } = await supabase
    .from('queue_items')
    .select('id')
    .order('position', { ascending: true })
    .limit(1);

  if (!firstItem || firstItem.length === 0) {
    return getQueue(); // Return current queue if empty
  }

  // Delete the first item
  const { error } = await supabase
    .from('queue_items')
    .delete()
    .eq('id', firstItem[0].id);

  if (error) {
    console.error('Error removing from queue:', error);
    throw error;
  }
  
  // Fetch and return the updated queue immediately
  return getQueue();
}

// Remove a specific item from the queue by ID
export async function removeQueueItem(id: string): Promise<QueueItem[]> {
  const { error } = await supabase
    .from('queue_items')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error removing queue item:', error);
    throw error;
  }
  
  // Fetch and return the updated queue immediately
  return getQueue();
}

// Subscribe to queue changes
export function subscribeToQueue(callback: (queue: QueueItem[]) => void) {
  console.log("Setting up Supabase real-time subscription for queue_items table");
  
  const subscription = supabase
    .channel('queue-changes')
    .on(
      'postgres_changes',
      { 
        event: '*', 
        schema: 'public', 
        table: 'queue_items'
      },
      async (payload) => {
        console.log("Queue change detected:", payload.eventType);
        const queue = await getQueue();
        callback(queue);
      }
    )
    .subscribe((status) => {
      console.log("Subscription status:", status);
    });

  return subscription;
}
