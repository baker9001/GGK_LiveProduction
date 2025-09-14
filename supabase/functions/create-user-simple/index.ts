import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  return new Response(
    JSON.stringify({ 
      success: true,
      message: "Simple function works!",
      timestamp: new Date().toISOString()
    }),
    { 
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      }
    }
  );
});