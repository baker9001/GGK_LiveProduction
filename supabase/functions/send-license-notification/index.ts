import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@^2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface LicenseNotificationRequest {
  student_license_id: string;
  notification_type: 'assignment' | 'expiry_warning' | 'activation_reminder';
}

interface StudentLicenseData {
  id: string;
  student_id: string;
  license_id: string;
  status: string;
  valid_from_snapshot: string;
  valid_to_snapshot: string;
  assigned_at: string;
  student: {
    user_id: string;
    student_code: string;
  };
  user: {
    email: string;
    raw_user_meta_data: {
      name?: string;
    };
  };
  license: {
    id: string;
    data_structure: {
      subject: {
        name: string;
      };
      program: {
        name: string;
      };
      provider: {
        name: string;
      };
      region: {
        name: string;
      };
    };
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { student_license_id, notification_type }: LicenseNotificationRequest = await req.json();

    if (!student_license_id || !notification_type) {
      throw new Error("Missing required parameters: student_license_id and notification_type");
    }

    // Fetch student license details with all related data
    const { data: licenseData, error: fetchError } = await supabase
      .from('student_licenses')
      .select(`
        id,
        student_id,
        license_id,
        status,
        valid_from_snapshot,
        valid_to_snapshot,
        assigned_at,
        students!inner (
          user_id,
          student_code,
          users!inner (
            email,
            raw_user_meta_data
          )
        ),
        licenses!inner (
          id,
          data_structures!inner (
            edu_subjects!inner (
              name
            ),
            programs!inner (
              name
            ),
            providers!inner (
              name
            ),
            regions!inner (
              name
            )
          )
        )
      `)
      .eq('id', student_license_id)
      .single();

    if (fetchError || !licenseData) {
      console.error('Error fetching license data:', fetchError);
      throw new Error(`Failed to fetch license data: ${fetchError?.message || 'Unknown error'}`);
    }

    // Extract nested data safely
    const studentEmail = licenseData.students?.users?.email;
    const studentName = licenseData.students?.users?.raw_user_meta_data?.name ||
                        studentEmail?.split('@')[0] ||
                        'Student';
    const subjectName = licenseData.licenses?.data_structures?.edu_subjects?.name || 'Unknown Subject';
    const programName = licenseData.licenses?.data_structures?.programs?.name || 'Unknown Program';
    const providerName = licenseData.licenses?.data_structures?.providers?.name || 'Unknown Provider';
    const regionName = licenseData.licenses?.data_structures?.regions?.name || 'Unknown Region';

    if (!studentEmail) {
      throw new Error('Student email not found');
    }

    const validFrom = new Date(licenseData.valid_from_snapshot);
    const validTo = new Date(licenseData.valid_to_snapshot);
    const daysUntilExpiry = Math.ceil((validTo.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    let emailSubject: string;
    let emailHtml: string;

    // Generate email content based on notification type
    switch (notification_type) {
      case 'assignment':
        emailSubject = `New License Assigned: ${subjectName}`;
        emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #8CC63F 0%, #7AB635 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .license-card { background: white; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .status-badge { display: inline-block; background: #f59e0b; color: white; padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; margin-bottom: 10px; }
    .info-row { margin: 10px 0; }
    .label { font-weight: bold; color: #666; display: inline-block; width: 120px; }
    .value { color: #333; }
    .cta-button { display: inline-block; background: #8CC63F; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎓 New License Assigned!</h1>
    </div>
    <div class="content">
      <p>Hello ${studentName},</p>
      <p>Great news! A new license has been assigned to you and is ready for activation.</p>

      <div class="license-card">
        <div class="status-badge">⏳ PENDING ACTIVATION</div>
        <h2 style="margin: 10px 0; color: #8CC63F;">${subjectName}</h2>

        <div class="info-row">
          <span class="label">Program:</span>
          <span class="value">${programName}</span>
        </div>
        <div class="info-row">
          <span class="label">Provider:</span>
          <span class="value">${providerName}</span>
        </div>
        <div class="info-row">
          <span class="label">Region:</span>
          <span class="value">${regionName}</span>
        </div>
        <div class="info-row">
          <span class="label">Valid From:</span>
          <span class="value">${validFrom.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
        <div class="info-row">
          <span class="label">Valid Until:</span>
          <span class="value">${validTo.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      <div class="warning">
        <strong>⚠️ Action Required:</strong> This license requires your explicit activation before you can access the content.
        Please log in to your account and activate this license to begin using it.
      </div>

      <div style="text-align: center;">
        <a href="${Deno.env.get('SITE_URL') || 'https://yourdomain.com'}/student-module/licenses" class="cta-button">
          Activate License Now →
        </a>
      </div>

      <p style="margin-top: 30px;">
        <strong>Important Notes:</strong>
      </p>
      <ul>
        <li>You must activate this license between ${validFrom.toLocaleDateString()} and ${validTo.toLocaleDateString()}</li>
        <li>Once activated, the license cannot be deactivated or transferred</li>
        <li>Activation must be completed within the validity period</li>
        <li>If you don't activate before expiry, you'll lose access to this license</li>
      </ul>

      <p>If you have any questions or need assistance, please contact your administrator.</p>

      <p>Best regards,<br>The Academic Team</p>
    </div>
    <div class="footer">
      <p>This is an automated notification. Please do not reply to this email.</p>
      <p>© ${new Date().getFullYear()} Your Institution. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
        `;
        break;

      case 'activation_reminder':
        emailSubject = `Reminder: Activate Your ${subjectName} License`;
        emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .reminder-box { background: #fef3c7; border: 2px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center; }
    .cta-button { display: inline-block; background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ License Activation Reminder</h1>
    </div>
    <div class="content">
      <p>Hello ${studentName},</p>
      <p>This is a friendly reminder that you have a license assigned to you that hasn't been activated yet.</p>

      <div class="reminder-box">
        <h2 style="margin: 10px 0; color: #f59e0b;">${subjectName}</h2>
        <p style="font-size: 18px; margin: 15px 0;">
          <strong>⏰ ${daysUntilExpiry} days remaining</strong> to activate this license
        </p>
        <p>Valid until: ${validTo.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <div style="text-align: center;">
        <a href="${Deno.env.get('SITE_URL') || 'https://yourdomain.com'}/student-module/licenses" class="cta-button">
          Activate Now →
        </a>
      </div>

      <p>Don't miss out on accessing your learning materials. Activate your license today!</p>

      <p>Best regards,<br>The Academic Team</p>
    </div>
    <div class="footer">
      <p>This is an automated reminder. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
        `;
        break;

      case 'expiry_warning':
        emailSubject = `Urgent: Your ${subjectName} License Expires in ${daysUntilExpiry} Days`;
        emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .warning-box { background: #fee2e2; border: 2px solid #ef4444; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ License Expiring Soon</h1>
    </div>
    <div class="content">
      <p>Hello ${studentName},</p>
      <p>This is an important reminder about your license that will expire soon.</p>

      <div class="warning-box">
        <h2 style="margin: 10px 0; color: #ef4444;">${subjectName}</h2>
        <p style="font-size: 24px; margin: 15px 0; font-weight: bold; color: #ef4444;">
          ⏰ ${daysUntilExpiry} DAYS REMAINING
        </p>
        <p><strong>Expires:</strong> ${validTo.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <p><strong>What this means:</strong></p>
      <ul>
        <li>Your access to ${subjectName} content will end on ${validTo.toLocaleDateString()}</li>
        <li>Make sure to complete any pending work before the expiry date</li>
        <li>Save or download any important materials you may need later</li>
        <li>Contact your administrator if you need a license renewal</li>
      </ul>

      <p>If you need continued access to this content, please contact your school administrator about license renewal options.</p>

      <p>Best regards,<br>The Academic Team</p>
    </div>
    <div class="footer">
      <p>This is an automated warning. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
        `;
        break;

      default:
        throw new Error(`Unknown notification type: ${notification_type}`);
    }

    // Call the existing send-email function
    const emailResponse = await fetch(
      `${supabaseUrl}/functions/v1/send-email`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: studentEmail,
          subject: emailSubject,
          html: emailHtml,
        }),
      }
    );

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('Email sending failed:', errorText);
      throw new Error(`Failed to send email: ${errorText}`);
    }

    // Mark notification as sent
    await supabase
      .from('student_licenses')
      .update({ notification_sent: true, updated_at: new Date().toISOString() })
      .eq('id', student_license_id);

    return new Response(
      JSON.stringify({
        success: true,
        message: `${notification_type} notification sent successfully to ${studentEmail}`,
        student_license_id,
        notification_type,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error) {
    console.error('Error in send-license-notification:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
