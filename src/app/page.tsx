'use client';
import { useState, useEffect } from 'react';
import QueueModal from '../components/QueueModal';
import QueueContents from '../components/QueueContents';
import AuthModal from '../components/AuthModal';
import { supabase } from '../utils/supabase';
import { getQueue, pushToQueue, popFromQueue, subscribeToQueue, QueueItem } from '../services/queueService';

// Polling interval in milliseconds (e.g., refresh every 3 seconds)
const POLLING_INTERVAL = 3000;

export default function Home() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [operation, setOperation] = useState<'push' | 'pop'>('push');
  const [user, setUser] = useState<any>(null);
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
      
      // Get initial queue data
      const queueData = await getQueue();
      setQueue(queueData);
      
      setLoading(false);
    };

    initApp();

    // Setup auth state change listener
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user || null);
    });

    // Subscribe to queue changes
    const queueSubscription = subscribeToQueue((updatedQueue) => {
      setQueue(updatedQueue);
    });
    
    // Set up polling for periodic refreshes
    const pollingInterval = setInterval(async () => {
      try {
        const updatedQueue = await getQueue();
        setQueue(updatedQueue);
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, POLLING_INTERVAL);

    return () => {
      authSubscription.unsubscribe();
      queueSubscription.unsubscribe();
      clearInterval(pollingInterval);
    };
  }, []);

  const handlePush = () => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    setOperation('push');
    setIsOpen(true);
  };

  const handlePop = () => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    if (queue.length > 0) {
      setOperation('pop');
      setIsOpen(true);
    }
  };

  const handleConfirm = async (value1?: string, value2?: string) => {
    if (!user) return;
    
    setOperationInProgress(true);
    
    try {
      if (operation === 'push' && value1 && value2) {
        // Update queue immediately after push
        const updatedQueue = await pushToQueue(value1, value2);
        setQueue(updatedQueue);
      } else if (operation === 'pop' && queue.length > 0) {
        // Update queue immediately after pop
        const updatedQueue = await popFromQueue();
        setQueue(updatedQueue);
      }
    } catch (error) {
      console.error('Operation failed:', error);
    } finally {
      setOperationInProgress(false);
      setIsOpen(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading queue...</div>
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
      
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-2xl font-bold mb-4 text-white">Live Queue</h1>
        
        {/* Only show push/pop buttons to authenticated users */}
        {user && (
          <div className="flex gap-4 mb-4">
            <button 
              onClick={handlePush}
              className="px-4 py-2 bg-blue-500 text-white rounded"
              disabled={operationInProgress}
            >
              Push
            </button>
            <button 
              onClick={handlePop}
              className="px-4 py-2 bg-red-500 text-white rounded"
              disabled={queue.length === 0 || operationInProgress}
            >
              Pop
            </button>
          </div>
        )}

        {/* Option 1: Pass queue data from parent */}
        <QueueContents queue={queue} />
        
        {/* Option 2: Let QueueContents fetch its own data */}
        {/* <QueueContents /> */}
        
        {!user && (
          <p className="mt-4 text-gray-400 text-center">
            Sign in to add or remove items from the queue
          </p>
        )}
      </div>

      <QueueModal 
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        operation={operation}
        onConfirm={handleConfirm}
        itemToRemove={queue.length > 0 ? `[${queue[0].value1}] v/s [${queue[0].value2}]` : undefined}
        isProcessing={operationInProgress}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </main>
  );
}
