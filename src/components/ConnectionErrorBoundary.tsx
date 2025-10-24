// src/components/ConnectionErrorBoundary.tsx
import React, { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw, WifiOff, CheckCircle } from 'lucide-react';
import { checkSupabaseConnection } from '@/lib/supabase';

interface ConnectionErrorBoundaryProps {
  children: React.ReactNode;
}

export const ConnectionErrorBoundary: React.FC<ConnectionErrorBoundaryProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const checkConnection = async () => {
    setIsChecking(true);
    try {
      const connected = await checkSupabaseConnection();
      setIsConnected(connected);
      if (connected) {
        setRetryCount(0);
      }
    } catch (error) {
      setIsConnected(false);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    // Initial connection check
    checkConnection();

    // Set up periodic connection checks
    const interval = setInterval(() => {
      if (!isConnected) {
        checkConnection();
      }
    }, 10000); // Check every 10 seconds if disconnected

    return () => clearInterval(interval);
  }, [isConnected]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    checkConnection();
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
              <WifiOff className="w-6 h-6 text-red-600" />
            </div>
            
            <h2 className="mt-4 text-xl font-semibold text-center text-gray-900">
              Connection Error
            </h2>
            
            <p className="mt-2 text-sm text-center text-gray-600">
              Unable to connect to the database. This might be due to:
            </p>
            
            <ul className="mt-4 text-sm text-gray-600 space-y-2">
              <li className="flex items-start">
                <span className="block mt-1 w-1 h-1 bg-gray-400 rounded-full mr-2 flex-shrink-0"></span>
                Network connectivity issues
              </li>
              <li className="flex items-start">
                <span className="block mt-1 w-1 h-1 bg-gray-400 rounded-full mr-2 flex-shrink-0"></span>
                WebContainer/StackBlitz limitations
              </li>
              <li className="flex items-start">
                <span className="block mt-1 w-1 h-1 bg-gray-400 rounded-full mr-2 flex-shrink-0"></span>
                Incorrect Supabase configuration
              </li>
            </ul>

            <div className="mt-6 space-y-3">
              <button
                onClick={handleRetry}
                disabled={isChecking}
                className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isChecking ? (
                  <>
                    <RefreshCw className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    Checking connection...
                  </>
                ) : (
                  <>
                    <RefreshCw className="-ml-1 mr-2 h-4 w-4" />
                    Retry Connection
                  </>
                )}
              </button>

              {retryCount > 2 && (
                <div className="text-sm text-gray-600 text-center">
                  <p>Still having issues?</p>
                  <p className="mt-1">
                    Try refreshing the page or check your .env configuration
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="text-xs text-gray-500">
                <p className="font-semibold">Quick fixes:</p>
                <ol className="mt-2 space-y-1 list-decimal list-inside">
                  <li>Check your internet connection</li>
                  <li>Verify VITE_SUPABASE_URL in .env</li>
                  <li>Ensure VITE_SUPABASE_ANON_KEY is correct</li>
                  <li>Try refreshing the browser (Ctrl/Cmd + R)</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// Optional: Connection status indicator component
export const ConnectionStatus: React.FC = () => {
  const [isConnected, setIsConnected] = useState(true);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      const connected = await checkSupabaseConnection();
      setIsConnected(connected);
      setIsVisible(!connected);
      
      if (connected && isVisible) {
        // Show success message briefly
        setTimeout(() => setIsVisible(false), 3000);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className={`flex items-center px-4 py-2 rounded-lg shadow-lg ${
        isConnected ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
      }`}>
        {isConnected ? (
          <>
            <CheckCircle className="w-4 h-4 mr-2" />
            Connected
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4 mr-2" />
            Connection Lost
          </>
        )}
      </div>
    </div>
  );
};