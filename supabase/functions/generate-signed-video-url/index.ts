import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  materialId: string;
}

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // 10 requests per minute per user
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

// Helper function to check rate limits
function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);

  if (!userLimit || userLimit.resetAt < now) {
    // Reset or initialize
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (userLimit.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  userLimit.count++;
  return true;
}

// Helper function to generate token hash
function generateTokenHash(materialId: string, userId: string, timestamp: number): string {
  const data = `${materialId}:${userId}:${timestamp}`;
  return btoa(data);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error("Authentication error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { materialId }: RequestBody = await req.json();

    if (!materialId) {
      return new Response(
        JSON.stringify({ error: "Material ID is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create admin client early so it's available for all operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Rate limiting check
    if (!checkRateLimit(user.id)) {
      console.warn(`Rate limit exceeded for user: ${user.id}`);

      // Log suspicious activity (wrapped in try-catch to not block response)
      try {
        await supabaseAdmin.from("suspicious_video_activity").insert({
          user_id: user.id,
          material_id: materialId,
          activity_type: "rapid_token_requests",
          severity: "medium",
          details: { message: "Exceeded rate limit for video token requests" },
          ip_address: req.headers.get("x-forwarded-for") || "unknown",
          user_agent: req.headers.get("user-agent") || "unknown",
        });
      } catch (logError) {
        console.error("Failed to log rate limit violation:", logError);
      }

      return new Response(
        JSON.stringify({
          error: "Too many requests. Please wait before requesting another video.",
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: material, error: materialError } = await supabaseAdmin
      .from("materials")
      .select("id, title, type, file_path, status, data_structure_id")
      .eq("id", materialId)
      .eq("status", "active")
      .single();

    if (materialError || !material) {
      console.error("Material fetch error:", materialError);
      return new Response(JSON.stringify({ error: "Material not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (material.type !== "video") {
      return new Response(
        JSON.stringify({ error: "This endpoint is only for video materials" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: student, error: studentError } = await supabaseAdmin
      .from("students")
      .select("id, user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (studentError) {
      console.error("Student lookup error:", studentError);
    }

    const { data: teacher, error: teacherError } = await supabaseAdmin
      .from("teachers")
      .select("id, user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (teacherError) {
      console.error("Teacher lookup error:", teacherError);
    }

    // Check if user is a system admin via users table (primary method)
    const { data: systemUser, error: systemUserError } = await supabaseAdmin
      .from("users")
      .select("id, user_type, email")
      .eq("email", user.email)
      .maybeSingle();

    if (systemUserError) {
      console.error("System user lookup error:", systemUserError);
    }

    // Check if user is a system admin via admin_users table (secondary method)
    // admin_users.id matches users.id, so we need to find the user's ID first
    let adminUser = null;
    if (systemUser?.id) {
      const { data: adminData, error: adminError } = await supabaseAdmin
        .from("admin_users")
        .select("id")
        .eq("id", systemUser.id)
        .maybeSingle();

      if (adminError) {
        console.error("Admin lookup error:", adminError);
      } else {
        adminUser = adminData;
      }
    }

    // User has access if they are a student, teacher, or system admin
    const isSystemAdmin = systemUser?.user_type === 'system' ||
                          systemUser?.user_type === 'system_admin' ||
                          adminUser !== null;

    const hasAccess = student || teacher || isSystemAdmin;

    // Log access check results for debugging
    console.log(`Access check for user ${user.id}:`, {
      email: user.email,
      isStudent: !!student,
      isTeacher: !!teacher,
      isSystemAdmin: isSystemAdmin,
      userType: systemUser?.user_type,
      hasAdminRecord: !!adminUser,
      hasAccess: hasAccess
    });

    if (!hasAccess) {
      return new Response(
        JSON.stringify({
          error: "Access denied. User must be a student, teacher, or admin.",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check for concurrent active sessions (potential sharing/abuse)
    const { data: activeSessions } = await supabaseAdmin
      .from("video_session_tokens")
      .select("id")
      .eq("material_id", materialId)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .gte("last_heartbeat", new Date(Date.now() - 600000).toISOString()); // Active in last 10 minutes

    if (activeSessions && activeSessions.length >= 2) {
      // Log suspicious activity - multiple concurrent sessions (wrapped in try-catch)
      try {
        await supabaseAdmin.from("suspicious_video_activity").insert({
          user_id: user.id,
          material_id: materialId,
          activity_type: "multiple_concurrent_sessions",
          severity: "high",
          details: {
            active_sessions: activeSessions.length,
            message: "User attempting to stream same video on multiple devices",
          },
          ip_address: req.headers.get("x-forwarded-for") || "unknown",
          user_agent: req.headers.get("user-agent") || "unknown",
        });
      } catch (logError) {
        console.error("Failed to log concurrent session violation:", logError);
      }

      return new Response(
        JSON.stringify({
          error: "This video is already being streamed on another device. Please close other sessions first.",
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const expiresIn = 7200; // 2 hours
    const timestamp = Date.now();
    const tokenHash = generateTokenHash(materialId, user.id, timestamp);
    const sessionId = crypto.randomUUID();

    const { data: signedUrlData, error: signedError } = await supabaseAdmin
      .storage.from("materials_files")
      .createSignedUrl(material.file_path, expiresIn, {
        download: false, // Explicitly disable download
      });

    if (signedError || !signedUrlData) {
      console.error("Signed URL generation error:", signedError);
      return new Response(
        JSON.stringify({ error: "Failed to generate secure video URL" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const userId = student?.user_id || teacher?.user_id || user.id;
    const ipAddress = req.headers.get("x-forwarded-for") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Store video access token
    const { error: tokenError } = await supabaseAdmin
      .from("video_access_tokens")
      .insert({
        material_id: materialId,
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent,
      });

    if (tokenError) {
      console.error("Failed to store video access token:", tokenError);
    }

    // Create video session token
    const { error: sessionError } = await supabaseAdmin
      .from("video_session_tokens")
      .insert({
        session_id: sessionId,
        material_id: materialId,
        user_id: user.id,
        token_hash: tokenHash,
        ip_address: ipAddress,
        device_fingerprint: userAgent, // Simple fingerprint using user agent
      });

    if (sessionError) {
      console.error("Failed to create video session token:", sessionError);
    }

    // Log comprehensive audit trail
    const { error: auditError } = await supabaseAdmin
      .from("video_access_audit")
      .insert({
        material_id: materialId,
        user_id: user.id,
        student_id: student?.id || null,
        teacher_id: teacher?.id || null,
        access_type: "token_generated",
        session_id: sessionId,
        ip_address: ipAddress,
        user_agent: userAgent,
        metadata: {
          expires_at: expiresAt.toISOString(),
          expires_in: expiresIn,
          token_hash: tokenHash,
        },
      });

    if (auditError) {
      console.error("Failed to log video access audit:", auditError);
    }

    // Also log to material_access_logs for backward compatibility
    const { error: logError } = await supabaseAdmin
      .from("material_access_logs")
      .insert({
        user_id: userId,
        material_id: materialId,
        access_type: "video_stream",
        ip_address: ipAddress,
        user_agent: userAgent,
        accessed_at: new Date().toISOString(),
      });

    if (logError) {
      console.error("Failed to log access:", logError);
    }

    console.log(`Video token generated for user ${user.id}, material ${materialId}, session ${sessionId}`);

    return new Response(
      JSON.stringify({
        signedUrl: signedUrlData.signedUrl,
        expiresAt: expiresAt.toISOString(),
        expiresIn: expiresIn,
        title: material.title,
        sessionId: sessionId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
