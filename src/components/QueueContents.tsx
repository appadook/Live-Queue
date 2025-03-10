'use client';
import { useState, useEffect, useCallback } from 'react';
import { QueueItem, getQueue, subscribeToQueue } from '../services/queueService';

// Polling interval in milliseconds (e.g., refresh every 3 seconds)
const POLLING_INTERVAL = 3000;

interface QueueContentsProps {
  // Optional queue prop for cases when parent wants to control the data
  queue?: QueueItem[];
  isAuthenticated?: boolean;
  onRemoveItem?: (id: string) => void;
  removeButtonLabel?: string; // Added prop for custom label
}

export default function QueueContents({ 
  queue: externalQueue,
  isAuthenticated = false,
  onRemoveItem,
  removeButtonLabel = "Remove" // Default label
}: QueueContentsProps) {
  // Local state for when component fetches its own data
  const [internalQueue, setInternalQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Use the queue provided by props if available, otherwise use internal state
  const queue = externalQueue || internalQueue;

  // Fix: Use useCallback to wrap the function so we can include it in the dependency array
  const fetchQueueData = useCallback(async () => {
    try {
      const data = await getQueue();
      
      // Only update if we're managing our own queue (not using external queue)
      if (!externalQueue) {
        setInternalQueue(data);
        setError(null);
        setLoading(false);
      }
      return data;
    } catch (err) {
      console.error('Error fetching queue data:', err);
      if (!externalQueue) {
        setError('Failed to load queue data');
        setLoading(false);
      }
      return null;
    }
  }, [externalQueue]); // Add externalQueue as dependency

  // Effect for initial load and subscription
  useEffect(() => {
    // If queue is provided externally, don't fetch data
    if (externalQueue) return;
    
    fetchQueueData();
    
    // Subscribe to real-time updates
    const subscription = subscribeToQueue((updatedQueue) => {
      setInternalQueue(updatedQueue);
    });
    
    // Set up polling for periodic refreshes
    const pollingInterval = setInterval(fetchQueueData, POLLING_INTERVAL);
    
    // Clean up on unmount
    return () => {
      subscription.unsubscribe();
      clearInterval(pollingInterval);
    };
  }, [externalQueue, fetchQueueData]); // Add fetchQueueData to dependencies

  useEffect(() => {
    // When externalQueue changes, update the loading state
    if (externalQueue) {
      setLoading(false);
    }
  }, [externalQueue]);

  if (!externalQueue && loading) {
    return (
      <div className="border border-gray-700 p-4 min-w-[300px] bg-gray-800 text-gray-200">
        <h2 className="text-xl mb-2 text-gray-100">Queue Contents:</h2>
        <div className="text-gray-400">Loading queue...</div>
      </div>
    );
  }
  
  if (!externalQueue && error) {
    return (
      <div className="border border-gray-700 p-4 min-w-[300px] bg-gray-800 text-gray-200">
        <h2 className="text-xl mb-2 text-gray-100">Queue Contents:</h2>
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="border border-gray-700 p-2 sm:p-4 min-w-[300px] w-full bg-gray-800 text-gray-200 rounded-lg">
      <h2 className="text-lg sm:text-xl mb-2 text-gray-100">Queue Contents:</h2>
      {queue.length === 0 ? (
        <p className="text-gray-400 text-center py-4">Queue is empty</p>
      ) : (
        <ul>
          {queue.map((item, index) => (
            <li key={`${item.id}-${index}`} className="border-b border-gray-700 py-2 text-gray-300 flex flex-wrap sm:flex-nowrap justify-between items-center gap-2">
              <div className="flex-1 min-w-0">
                {index === 0 ? <span className="font-bold mr-2 text-blue-400">[Front]</span> : ''}
                <span className="break-words">
                  [{item.value1}] v/s [{item.value2}]
                </span>
                {index === queue.length - 1 ? <span className="font-bold ml-2 text-green-400">[Back]</span> : ''}
              </div>
              
              {/* Only show remove button if user is authenticated and onRemoveItem is provided */}
              {isAuthenticated && onRemoveItem && (
                <button 
                  onClick={() => onRemoveItem(item.id)}
                  className="px-2 py-1 bg-amber-600 text-white text-xs rounded hover:bg-amber-700 transition shrink-0"
                  aria-label={removeButtonLabel}
                >
                  {removeButtonLabel}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
