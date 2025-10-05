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

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

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

    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from("admin_users")
      .select("id")
      .eq("email", user.email)
      .maybeSingle();

    if (adminError) {
      console.error("Admin lookup error:", adminError);
    }

    const hasAccess = student || teacher || adminUser;

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

    const expiresIn = 7200;

    const { data: signedUrlData, error: signedError } = await supabaseAdmin
      .storage.from("materials_files")
      .createSignedUrl(material.file_path, expiresIn);

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
    const accessLog = {
      user_id: userId,
      material_id: materialId,
      access_type: "video_stream",
      ip_address: req.headers.get("x-forwarded-for") || "unknown",
      user_agent: req.headers.get("user-agent") || "unknown",
      accessed_at: new Date().toISOString(),
    };

    const { error: logError } = await supabaseAdmin
      .from("material_access_logs")
      .insert(accessLog);

    if (logError) {
      console.error("Failed to log access:", logError);
    }

    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    return new Response(
      JSON.stringify({
        signedUrl: signedUrlData.signedUrl,
        expiresAt: expiresAt.toISOString(),
        expiresIn: expiresIn,
        title: material.title,
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