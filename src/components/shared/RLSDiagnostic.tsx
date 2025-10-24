import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from './Button';
import { AlertCircle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

interface DiagnosticResult {
  test: string;
  status: 'success' | 'error' | 'pending';
  message: string;
  details?: any;
}

export function RLSDiagnostic() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostics = async () => {
    setIsRunning(true);
    const diagnosticResults: DiagnosticResult[] = [];

    // Test 1: Check Supabase Auth Session
    diagnosticResults.push({
      test: 'Checking Supabase Auth Session',
      status: 'pending',
      message: 'Verifying authentication...'
    });
    setResults([...diagnosticResults]);

    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;

      if (session) {
        diagnosticResults[0] = {
          test: 'Supabase Auth Session',
          status: 'success',
          message: `Authenticated as: ${session.user.email}`,
          details: {
            userId: session.user.id,
            email: session.user.email,
            emailConfirmed: session.user.email_confirmed_at
          }
        };
      } else {
        diagnosticResults[0] = {
          test: 'Supabase Auth Session',
          status: 'error',
          message: 'No active session found'
        };
      }
    } catch (error: any) {
      diagnosticResults[0] = {
        test: 'Supabase Auth Session',
        status: 'error',
        message: error.message,
        details: error
      };
    }
    setResults([...diagnosticResults]);

    // Test 2: Check admin_users table access
    diagnosticResults.push({
      test: 'Checking admin_users access',
      status: 'pending',
      message: 'Testing RLS policies...'
    });
    setResults([...diagnosticResults]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const { data, error } = await supabase
          .from('admin_users')
          .select('id, email')
          .eq('id', session.user.id)
          .maybeSingle();

        if (error) throw error;

        diagnosticResults[1] = {
          test: 'admin_users Table Access',
          status: data ? 'success' : 'error',
          message: data ? 'Successfully accessed admin_users table' : 'User not found in admin_users',
          details: data
        };
      } else {
        diagnosticResults[1] = {
          test: 'admin_users Table Access',
          status: 'error',
          message: 'No user ID available'
        };
      }
    } catch (error: any) {
      diagnosticResults[1] = {
        test: 'admin_users Table Access',
        status: 'error',
        message: error.message,
        details: {
          code: error.code,
          details: error.details,
          hint: error.hint
        }
      };
    }
    setResults([...diagnosticResults]);

    // Test 3: Check is_admin_user() function
    diagnosticResults.push({
      test: 'Checking is_admin_user() function',
      status: 'pending',
      message: 'Testing helper function...'
    });
    setResults([...diagnosticResults]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const { data, error } = await supabase
          .rpc('is_admin_user', { user_id: session.user.id });

        if (error) throw error;

        diagnosticResults[2] = {
          test: 'is_admin_user() Function',
          status: data ? 'success' : 'error',
          message: data ? 'User is recognized as admin' : 'User is NOT recognized as admin',
          details: { isAdmin: data }
        };
      } else {
        diagnosticResults[2] = {
          test: 'is_admin_user() Function',
          status: 'error',
          message: 'No user ID available'
        };
      }
    } catch (error: any) {
      diagnosticResults[2] = {
        test: 'is_admin_user() Function',
        status: 'error',
        message: error.message,
        details: {
          code: error.code,
          details: error.details,
          hint: error.hint
        }
      };
    }
    setResults([...diagnosticResults]);

    // Test 4: Check schools table access
    diagnosticResults.push({
      test: 'Checking schools table access',
      status: 'pending',
      message: 'Testing schools RLS policies...'
    });
    setResults([...diagnosticResults]);

    try {
      const { data, error } = await supabase
        .from('schools')
        .select('id, name', { count: 'exact', head: false })
        .limit(5);

      if (error) throw error;

      diagnosticResults[3] = {
        test: 'schools Table Access',
        status: 'success',
        message: `Successfully accessed schools table (${data?.length || 0} records)`,
        details: data
      };
    } catch (error: any) {
      diagnosticResults[3] = {
        test: 'schools Table Access',
        status: 'error',
        message: error.message,
        details: {
          code: error.code,
          details: error.details,
          hint: error.hint
        }
      };
    }
    setResults([...diagnosticResults]);

    // Test 5: Check branches table access
    diagnosticResults.push({
      test: 'Checking branches table access',
      status: 'pending',
      message: 'Testing branches RLS policies...'
    });
    setResults([...diagnosticResults]);

    try {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name', { count: 'exact', head: false })
        .limit(5);

      if (error) throw error;

      diagnosticResults[4] = {
        test: 'branches Table Access',
        status: 'success',
        message: `Successfully accessed branches table (${data?.length || 0} records)`,
        details: data
      };
    } catch (error: any) {
      diagnosticResults[4] = {
        test: 'branches Table Access',
        status: 'error',
        message: error.message,
        details: {
          code: error.code,
          details: error.details,
          hint: error.hint
        }
      };
    }
    setResults([...diagnosticResults]);

    setIsRunning(false);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          RLS & Authentication Diagnostics
        </h3>
        <Button
          onClick={runDiagnostics}
          disabled={isRunning}
          leftIcon={<RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />}
        >
          {isRunning ? 'Running...' : 'Run Diagnostics'}
        </Button>
      </div>

      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((result, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${
                result.status === 'success'
                  ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                  : result.status === 'error'
                  ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                  : 'bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {result.status === 'success' ? (
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  ) : result.status === 'error' ? (
                    <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  ) : (
                    <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 dark:text-white">{result.test}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{result.message}</p>
                  {result.details && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200">
                        Show Details
                      </summary>
                      <pre className="mt-2 text-xs bg-gray-900 dark:bg-gray-950 text-green-400 p-3 rounded overflow-auto max-h-40">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {results.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          Click "Run Diagnostics" to test authentication and RLS policies
        </div>
      )}
    </div>
  );
}
