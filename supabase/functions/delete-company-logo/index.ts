import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Auth-Token",
};

// Helper function to verify admin user
async function isAdminUser(supabaseAdmin: any, userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from('admin_users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error checking admin status:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Exception checking admin status:', error);
    return false;
  }
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Allow POST or DELETE methods
    if (req.method !== "POST" && req.method !== "DELETE") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Get custom auth token from headers
    const authToken = req.headers.get("X-Auth-Token");
    if (!authToken) {
      return new Response(
        JSON.stringify({ error: "Authentication required. Please provide X-Auth-Token header." }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Decode and validate custom auth token
    let userId: string;
    try {
      const payload = JSON.parse(atob(authToken));

      // Check token expiration
      if (payload.exp && payload.exp < Date.now()) {
        return new Response(
          JSON.stringify({ error: "Authentication token expired" }),
          {
            status: 401,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      userId = payload.id;
      if (!userId) {
        throw new Error("Invalid token: missing user ID");
      }
    } catch (error) {
      console.error("Error decoding auth token:", error);
      return new Response(
        JSON.stringify({ error: "Invalid authentication token" }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Create Supabase admin client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase credentials");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is an admin
    const isAdmin = await isAdminUser(supabaseAdmin, userId);
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Access denied. System admin privileges required." }),
        {
          status: 403,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Get file path from request body
    const { path, paths } = await req.json();

    // Support both single path and multiple paths
    const pathsToDelete = paths || (path ? [path] : []);

    if (!pathsToDelete || pathsToDelete.length === 0) {
      return new Response(
        JSON.stringify({ error: "No file path(s) provided" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Filter out null/undefined paths
    const validPaths = pathsToDelete.filter((p: string | null) => p !== null && p !== undefined);

    if (validPaths.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid file paths to delete" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Delete files from storage using service role (bypasses RLS)
    const { data: deleteData, error: deleteError } = await supabaseAdmin.storage
      .from('company-logos')
      .remove(validPaths);

    if (deleteError) {
      console.error("Storage delete error:", deleteError);
      return new Response(
        JSON.stringify({
          error: "Failed to delete file(s)",
          details: deleteError.message
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Return success
    return new Response(
      JSON.stringify({
        success: true,
        deleted: validPaths.length,
        message: validPaths.length === 1
          ? "Logo deleted successfully"
          : `${validPaths.length} logos deleted successfully`,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
