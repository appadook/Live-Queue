'use client';
import { useState, useEffect, useCallback } from 'react';
import { QueueItem, getQueueByType, subscribeToQueueByType } from '../services/queueService';
import WaitingTimer from './WaitingTimer';

// Polling interval in milliseconds
const POLLING_INTERVAL = 3000;

interface WaitingRoomQueueProps {
  queue?: QueueItem[];
  isAuthenticated?: boolean;
  onRemoveItem?: (id: string) => void;
}

export default function WaitingRoomQueue({ 
  queue: externalQueue,
  isAuthenticated = false,
  onRemoveItem
}: WaitingRoomQueueProps) {
  const [internalQueue, setInternalQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const queue = externalQueue || internalQueue;

  const fetchQueueData = useCallback(async () => {
    try {
      const data = await getQueueByType('waitingRoom');
      
      if (!externalQueue) {
        setInternalQueue(data);
        setError(null);
        setLoading(false);
      }
      return data;
    } catch (err) {
      console.error('Error fetching waiting room data:', err);
      if (!externalQueue) {
        setError('Failed to load waiting room data');
        setLoading(false);
      }
      return null;
    }
  }, [externalQueue]);

  useEffect(() => {
    if (externalQueue) return;
    
    fetchQueueData();
    
    const subscription = subscribeToQueueByType('waitingRoom', (updatedQueue) => {
      setInternalQueue(updatedQueue);
    });
    
    const pollingInterval = setInterval(fetchQueueData, POLLING_INTERVAL);
    
    return () => {
      subscription.unsubscribe();
      clearInterval(pollingInterval);
    };
  }, [externalQueue, fetchQueueData]);

  useEffect(() => {
    if (externalQueue) {
      setLoading(false);
    }
  }, [externalQueue]);

  if (!externalQueue && loading) {
    return (
      <div className="border border-gray-700 p-4 min-w-[300px] bg-amber-900 text-gray-200">
        <h2 className="text-xl mb-2 text-amber-100">Waiting Room:</h2>
        <div className="text-gray-300">Loading waiting room...</div>
      </div>
    );
  }
  
  if (!externalQueue && error) {
    return (
      <div className="border border-gray-700 p-4 min-w-[300px] bg-amber-900 text-gray-200">
        <h2 className="text-xl mb-2 text-amber-100">Waiting Room:</h2>
        <div className="text-red-300">{error}</div>
      </div>
    );
  }

  return (
    <div className="border border-gray-700 p-4 min-w-[300px] bg-amber-900 text-gray-200">
      <h2 className="text-xl mb-2 text-amber-100">Waiting Room:</h2>
      {queue.length === 0 ? (
        <p className="text-gray-300">Waiting room is empty</p>
      ) : (
        <ul>
          {queue.map((item, index) => (
            <li key={`${item.id}-${index}`} className="border-b border-amber-800 py-2 text-amber-100 flex items-center">
              <div className="flex-1 flex items-center">
                {index === 0 ? <span className="font-bold mr-2 text-amber-200">[First]</span> : ''}
                <div>
                  <span>
                    [{item.value1}] v/s [{item.value2}]
                  </span>
                </div>
                {index === queue.length - 1 ? <span className="font-bold ml-2 text-amber-200">[Last]</span> : ''}
              </div>
              
              {/* Display timer more prominently on the side */}
              {item.moved_at && (
                <div className="min-w-[80px] text-center mx-2">
                  <WaitingTimer movedAt={item.moved_at} />
                </div>
              )}
              
              {isAuthenticated && onRemoveItem && (
                <button 
                  onClick={() => onRemoveItem(item.id)}
                  className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition"
                  aria-label="Remove item"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
