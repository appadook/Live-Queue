'use client';
import { useState, useEffect } from 'react';
import QueueModal from '../components/QueueModal';
import QueueContents from '../components/QueueContents';
import WaitingRoomQueue from '../components/WaitingRoomQueue';
import AuthModal from '../components/AuthModal';
import { supabase } from '../utils/supabase';
import { 
  getQueue,
  getQueueByType,
  pushToQueue,
  popFromWaitingRoom,
  removeQueueItem,
  moveItemToWaitingRoom,
  subscribeToQueue,
  subscribeToWaitingRoom,
  QueueItem 
} from '../services/queueService';
import { User } from '@supabase/supabase-js';

// Polling interval in milliseconds
const POLLING_INTERVAL = 3000;

export default function Home() {
  const [mainQueue, setMainQueue] = useState<QueueItem[]>([]);
  const [waitingQueue, setWaitingQueue] = useState<QueueItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [operation, setOperation] = useState<'push' | 'pop'>('push');
  const [activeQueue, setActiveQueue] = useState<'main' | 'waitingRoom'>('main');
  const [user, setUser] = useState<User | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [operationInProgress, setOperationInProgress] = useState(false);

  // Check for existing session and load initial queue data
  useEffect(() => {
    const initApp = async () => {
      setLoading(true);
      
      // Get authentication status
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      
      // Get initial queue data for both queues
      const mainQueueData = await getQueue();
      const waitingQueueData = await getQueueByType('waitingRoom');
      setMainQueue(mainQueueData);
      setWaitingQueue(waitingQueueData);
      
      setLoading(false);
    };

    initApp();

    // Setup auth state change listener
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user || null);
    });

    // Subscribe to main queue changes
    const mainQueueSubscription = subscribeToQueue((updatedQueue) => {
      setMainQueue(updatedQueue);
    });
    
    // Subscribe to waiting room queue changes
    const waitingQueueSubscription = subscribeToWaitingRoom((updatedQueue) => {
      setWaitingQueue(updatedQueue);
    });
    
    // Set up polling for periodic refreshes
    const mainPollingInterval = setInterval(async () => {
      try {
        const updatedQueue = await getQueue();
        setMainQueue(updatedQueue);
      } catch (error) {
        console.error('Main queue polling error:', error);
      }
    }, POLLING_INTERVAL);
    
    const waitingPollingInterval = setInterval(async () => {
      try {
        const updatedQueue = await getQueueByType('waitingRoom');
        setWaitingQueue(updatedQueue);
      } catch (error) {
        console.error('Waiting room polling error:', error);
      }
    }, POLLING_INTERVAL);

    return () => {
      authSubscription.unsubscribe();
      mainQueueSubscription.unsubscribe();
      waitingQueueSubscription.unsubscribe();
      clearInterval(mainPollingInterval);
      clearInterval(waitingPollingInterval);
    };
  }, []);

  // Push to main queue (same behavior)
  const handlePush = () => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    setOperation('push');
    setActiveQueue('main');
    setIsOpen(true);
  };

  // Pop from waiting room (changed behavior)
  // Updated to accept an optional queue parameter
  const handlePop = (queueType?: 'main' | 'waitingRoom') => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    
    // Default to waitingRoom if no queue type is specified
    const targetQueue = queueType || 'waitingRoom';
    const queue = targetQueue === 'main' ? mainQueue : waitingQueue;
    
    if (queue.length > 0) {
      setOperation('pop');
      setActiveQueue(targetQueue);
      setIsOpen(true);
    }
  };

  const handleConfirm = async (value1?: string, value2?: string) => {
    if (!user) return;
    
    setOperationInProgress(true);
    
    try {
      if (operation === 'push' && value1 && value2) {
        // Always push to main queue
        const updatedQueue = await pushToQueue(value1, value2);
        setMainQueue(updatedQueue);
      } else if (operation === 'pop') {
        // Always pop from waiting room
        const updatedQueue = await popFromWaitingRoom();
        setWaitingQueue(updatedQueue);
      }
    } catch (error) {
      console.error('Operation failed:', error);
    } finally {
      setOperationInProgress(false);
      setIsOpen(false);
    }
  };

  // Function to move an item from main to waiting room
  const handleMoveToWaitingRoom = async (id: string) => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    
    console.log('Starting move to waiting room for item:', id);
    setOperationInProgress(true);
    
    try {
      // Move the item from main to waiting room
      console.log('Calling moveItemToWaitingRoom...');
      const { main: updatedMainQueue, waitingRoom: updatedWaitingQueue } = await moveItemToWaitingRoom(id);
      
      console.log('Move completed, updating state...');
      console.log('New main queue length:', updatedMainQueue.length);
      console.log('New waiting room length:', updatedWaitingQueue.length);
      
      // Update both queues with the returned data
      setMainQueue(updatedMainQueue);
      setWaitingQueue(updatedWaitingQueue);
      
      console.log('Item moved to waiting room successfully');
    } catch (error) {
      console.error('Failed to move item to waiting room:', error);
    } finally {
      setOperationInProgress(false);
    }
  };

  const handleRemoveItem = async (id: string) => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    
    setOperationInProgress(true);
    
    try {
      // First, determine which queue the item belongs to
      const item = [...mainQueue, ...waitingQueue].find(item => item.id === id);
      
      if (!item) {
        console.error('Item not found in any queue');
        return;
      }
      
      // Remove the item - but don't assign the result since we don't use it
      await removeQueueItem(id);
      
      // Update the appropriate queue
      if (item.queue_type === 'main') {
        // Fetch fresh main queue data
        const updatedMainQueue = await getQueue();
        setMainQueue(updatedMainQueue);
      } else if (item.queue_type === 'waitingRoom') {
        // Fetch fresh waiting room data
        const updatedWaitingQueue = await getQueueByType('waitingRoom');
        setWaitingQueue(updatedWaitingQueue);
      }
    } catch (error) {
      console.error('Failed to remove item:', error);
    } finally {
      setOperationInProgress(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading queues...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-24 bg-gray-900 text-gray-100">
      <div className="absolute top-4 right-4 flex items-center gap-4">
        {user ? (
          <>
            <div className="text-sm text-gray-300">{user.email}</div>
            <button
              onClick={handleSignOut}
              className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition"
            >
              Sign Out
            </button>
          </>
        ) : (
          <button
            onClick={() => setAuthModalOpen(true)}
            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition"
          >
            Sign In / Sign Up
          </button>
        )}
      </div>
      
      <div className="flex flex-col items-center gap-6">
        <h1 className="text-2xl font-bold mb-4 text-white">Queue System</h1>
        
        {/* Waiting Room Queue */}
        <div className="w-full max-w-2xl">
          {/* Only show buttons to authenticated users */}
          {user && (
            <div className="flex gap-4 mb-2">
              <button 
                onClick={() => handlePop()}
                className="px-3 py-1 bg-amber-600 text-white rounded"
                disabled={waitingQueue.length === 0 || operationInProgress}
              >
                Pop from Waiting Room
              </button>
              <button 
                onClick={() => handlePop('waitingRoom')}
                className="px-3 py-1 bg-red-500 text-white rounded"
                disabled={waitingQueue.length === 0 || operationInProgress}
              >
                Remove from Waiting Room
              </button>
            </div>
          )}
          
          <WaitingRoomQueue 
            queue={waitingQueue}
            isAuthenticated={!!user}
            onRemoveItem={handleRemoveItem}
          />
        </div>
        
        {/* Main Queue */}
        <div className="w-full max-w-2xl">
          {/* Only show Add button to authenticated users */}
          {user && (
            <div className="flex gap-4 mb-2">
              <button 
                onClick={handlePush}
                className="px-3 py-1 bg-blue-500 text-white rounded"
                disabled={operationInProgress}
              >
                Add to Queue
              </button>
            </div>
          )}
          
          <QueueContents 
            queue={mainQueue}
            isAuthenticated={!!user}
            onRemoveItem={handleMoveToWaitingRoom}
            removeButtonLabel="Move to Waiting Room"
          />
        </div>
        
        {!user && (
          <p className="mt-4 text-gray-400 text-center">
            Sign in to add or remove items from the queues
          </p>
        )}
      </div>

      <QueueModal 
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        operation={operation}
        onConfirm={handleConfirm}
        itemToRemove={
          operation === 'pop' && activeQueue === 'main' && mainQueue.length > 0 
            ? `[${mainQueue[0].value1}] v/s [${mainQueue[0].value2}]` 
            : operation === 'pop' && activeQueue === 'waitingRoom' && waitingQueue.length > 0
            ? `[${waitingQueue[0].value1}] v/s [${waitingQueue[0].value2}]`
            : undefined
        }
        isProcessing={operationInProgress}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </main>
  );
}