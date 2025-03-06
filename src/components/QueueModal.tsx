'use client';
import { useState } from 'react';

interface QueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  operation: 'push' | 'pop';
  onConfirm: (value1?: string, value2?: string) => void;
  itemToRemove?: string;
  isProcessing?: boolean;
}

export default function QueueModal({ 
  isOpen, 
  onClose, 
  operation, 
  onConfirm,
  itemToRemove,
  isProcessing = false
}: QueueModalProps) {
  const [inputValue1, setInputValue1] = useState('');
  const [inputValue2, setInputValue2] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96 text-gray-900">
        <h2 className="text-xl font-bold mb-4 text-gray-900">
          {operation === 'push' ? 'Add to Queue' : 'Remove from Queue'}
        </h2>
        
        {operation === 'push' ? (
          <div className="mb-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <label htmlFor="queueItem1" className="block mb-2 text-gray-800">First value:</label>
                <input
                  id="queueItem1"
                  type="text"
                  value={inputValue1}
                  onChange={(e) => setInputValue1(e.target.value)}
                  className="w-full border p-2 rounded text-gray-900"
                  autoFocus
                />
              </div>
              <div className="flex-1">
                <label htmlFor="queueItem2" className="block mb-2 text-gray-800">Second value:</label>
                <input
                  id="queueItem2"
                  type="text"
                  value={inputValue2}
                  onChange={(e) => setInputValue2(e.target.value)}
                  className="w-full border p-2 rounded text-gray-900"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-4">
            <p className="text-gray-800">Are you sure you want to remove this item from the queue?</p>
            <p className="font-bold mt-2 text-gray-900">{itemToRemove}</p>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded"
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (operation === 'push') {
                onConfirm(inputValue1, inputValue2);
                setInputValue1('');
                setInputValue2('');
              } else {
                onConfirm();
              }
            }}
            className={`px-4 py-2 text-white rounded ${
              operation === 'push' ? 'bg-blue-500' : 'bg-red-500'
            }`}
            disabled={(operation === 'push' && (!inputValue1.trim() || !inputValue2.trim())) || isProcessing}
          >
            {isProcessing 
              ? 'Processing...' 
              : operation === 'push' 
                ? 'Add' 
                : 'Remove'
            }
          </button>
        </div>
      </div>
    </div>
  );
}
