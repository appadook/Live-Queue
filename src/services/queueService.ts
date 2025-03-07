import { supabase } from '../utils/supabase';

export interface QueueItem {
  id: string;
  value1: string;
  value2: string;
  created_at: string;
  position: number;
  queue_type: string; // Add queue_type to distinguish between queues
  moved_at?: string; // Timestamp when the item was moved to waiting room
}

// Fetch items for a specific queue type
export async function getQueueByType(queueType: string = 'main'): Promise<QueueItem[]> {
  const { data, error } = await supabase
    .from('queue_items')
    .select('*')
    .eq('queue_type', queueType)
    .order('position', { ascending: true });

  if (error) {
    console.error(`Error fetching ${queueType} queue:`, error);
    return [];
  }
  return data || [];
}

// Fetch all queue items from the main queue (for backward compatibility)
export async function getQueue(): Promise<QueueItem[]> {
  return getQueueByType('main');
}

// Get both queues
export async function getAllQueues(): Promise<{main: QueueItem[], waitingRoom: QueueItem[]}> {
  const main = await getQueueByType('main');
  const waitingRoom = await getQueueByType('waitingRoom');
  return { main, waitingRoom };
}

// Add a new item to a specific queue
export async function pushToQueueByType(value1: string, value2: string, queueType: string = 'main'): Promise<QueueItem[]> {
  // Get the current highest position for this queue type
  const { data: positions } = await supabase
    .from('queue_items')
    .select('position')
    .eq('queue_type', queueType)
    .order('position', { ascending: false })
    .limit(1);
  
  const newPosition = positions && positions.length > 0 ? positions[0].position + 1 : 0;
  
  const { error } = await supabase
    .from('queue_items')
    .insert([{ value1, value2, position: newPosition, queue_type: queueType }]);

  if (error) {
    console.error(`Error adding to ${queueType} queue:`, error);
    throw error;
  }
  
  // Return the updated queue
  return getQueueByType(queueType);
}

// Keep existing pushToQueue for backward compatibility
export async function pushToQueue(value1: string, value2: string): Promise<QueueItem[]> {
  return pushToQueueByType(value1, value2, 'main');
}

// Add to waiting room queue specifically
export async function pushToWaitingRoom(value1: string, value2: string): Promise<QueueItem[]> {
  return pushToQueueByType(value1, value2, 'waitingRoom');
}

// Remove first item from specific queue
export async function popFromQueueByType(queueType: string = 'main'): Promise<QueueItem[]> {
  const { data: firstItem } = await supabase
    .from('queue_items')
    .select('id')
    .eq('queue_type', queueType)
    .order('position', { ascending: true })
    .limit(1);

  if (!firstItem || firstItem.length === 0) {
    return getQueueByType(queueType);
  }

  const { error } = await supabase
    .from('queue_items')
    .delete()
    .eq('id', firstItem[0].id);

  if (error) {
    console.error(`Error removing from ${queueType} queue:`, error);
    throw error;
  }
  
  return getQueueByType(queueType);
}

// Keep existing popFromQueue for backward compatibility
export async function popFromQueue(): Promise<QueueItem[]> {
  return popFromQueueByType('main');
}

// Pop from waiting room queue specifically
export async function popFromWaitingRoom(): Promise<QueueItem[]> {
  return popFromQueueByType('waitingRoom');
}

// Remove a specific item from any queue
export async function removeQueueItem(id: string): Promise<QueueItem[]> {
  // First, determine which queue this item belongs to
  const { data: item } = await supabase
    .from('queue_items')
    .select('queue_type')
    .eq('id', id)
    .single();

  const queueType = item?.queue_type || 'main';
  
  const { error } = await supabase
    .from('queue_items')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error removing queue item:', error);
    throw error;
  }
  
  // Return the updated queue for the queue type that this item belonged to
  return getQueueByType(queueType);
}

// Subscribe to queue changes for a specific queue type
export function subscribeToQueueByType(queueType: string, callback: (queue: QueueItem[]) => void) {
  console.log(`Setting up Supabase subscription for ${queueType} queue`);
  
  const subscription = supabase
    .channel(`${queueType}-queue-changes`)
    .on(
      'postgres_changes',
      { 
        event: '*', 
        schema: 'public', 
        table: 'queue_items',
        filter: `queue_type=eq.${queueType}`
      },
      async () => {
        const queue = await getQueueByType(queueType);
        callback(queue);
      }
    )
    .subscribe();

  return subscription;
}

// Keep existing subscribeToQueue for backward compatibility
export function subscribeToQueue(callback: (queue: QueueItem[]) => void) {
  return subscribeToQueueByType('main', callback);
}

// Subscribe to waiting room queue specifically
export function subscribeToWaitingRoom(callback: (queue: QueueItem[]) => void) {
  return subscribeToQueueByType('waitingRoom', callback);
}

// Move an item from main queue to waiting room
export async function moveItemToWaitingRoom(id: string): Promise<{main: QueueItem[], waitingRoom: QueueItem[]}> {
  console.log('moveItemToWaitingRoom called with ID:', id);
  
  // First, get the item details
  const { data: item, error: fetchError } = await supabase
    .from('queue_items')
    .select('*')
    .eq('id', id)
    .single();
  
  if (fetchError) {
    console.error('Error fetching item:', fetchError);
    throw fetchError;
  }
  
  if (!item) {
    console.error('Item not found with ID:', id);
    throw new Error('Item not found');
  }
  
  console.log('Found item to move:', item);
  
  // Get the highest position in waiting room
  const { data: positions, error: posError } = await supabase
    .from('queue_items')
    .select('position')
    .eq('queue_type', 'waitingRoom')
    .order('position', { ascending: false })
    .limit(1);
  
  if (posError) {
    console.error('Error getting positions:', posError);
    throw posError;
  }
  
  const newPosition = positions && positions.length > 0 ? positions[0].position + 1 : 0;
  console.log('New position in waiting room:', newPosition);
  
  // Set the current time as moved_at timestamp
  const now = new Date().toISOString();
  
  // Update the item to be in the waiting room
  const { error: updateError, data: updateData } = await supabase
    .from('queue_items')
    .update({ 
      queue_type: 'waitingRoom', 
      position: newPosition,
      moved_at: now  // Add the timestamp
    })
    .eq('id', id)
    .select();

  if (updateError) {
    console.error('Error moving item to waiting room:', updateError);
    throw updateError;
  }
  
  console.log('Update result:', updateData);
  
  // Return both updated queues
  const main = await getQueueByType('main');
  const waitingRoom = await getQueueByType('waitingRoom');
  
  return { main, waitingRoom };
}
