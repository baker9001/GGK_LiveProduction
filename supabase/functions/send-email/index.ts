import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const { to, subject, html, text, provider, config } = await req.json();
    // Validate required fields
    if (!to || !subject || !html) {
      throw new Error('Missing required fields: to, subject, html');
    }
    // Get provider configuration
    const selectedProvider = provider || 'microsoft';
    const fromEmail = config?.from_email || Deno.env.get('MICROSOFT_FROM_EMAIL') || 'noreply@yourdomain.com';
    const fromName = config?.from_name || Deno.env.get('DEFAULT_FROM_NAME') || 'Your App';
    let result;
    // Microsoft Graph API
    if (selectedProvider === 'microsoft') {
      // Get Microsoft OAuth token
      const tenantId = Deno.env.get('MICROSOFT_TENANT_ID');
      const clientId = Deno.env.get('MICROSOFT_CLIENT_ID');
      const clientSecret = Deno.env.get('MICROSOFT_CLIENT_SECRET');
      if (!tenantId || !clientId || !clientSecret) {
        throw new Error('Microsoft credentials not configured. Please set MICROSOFT_TENANT_ID, MICROSOFT_CLIENT_ID, and MICROSOFT_CLIENT_SECRET');
      }
      console.log('Getting OAuth token...');
      // Get OAuth token
      const tokenResponse = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
          scope: 'https://graph.microsoft.com/.default'
        })
      });
      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('Microsoft OAuth error:', errorText);
        throw new Error(`Failed to authenticate with Microsoft: ${errorText}`);
      }
      const tokenData = await tokenResponse.json();
      console.log('Got OAuth token successfully');
      // Send email via Microsoft Graph
      const emailPayload = {
        message: {
          subject: subject,
          body: {
            contentType: 'HTML',
            content: html
          },
          toRecipients: [
            {
              emailAddress: {
                address: to
              }
            }
          ]
        },
        saveToSentItems: false
      };
      console.log('Sending email from:', fromEmail, 'to:', to);
      const sendResponse = await fetch(`https://graph.microsoft.com/v1.0/users/${fromEmail}/sendMail`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailPayload)
      });
      if (!sendResponse.ok) {
        const errorText = await sendResponse.text();
        console.error('Microsoft Graph API error:', errorText);
        throw new Error(`Failed to send email via Microsoft: ${sendResponse.status} - ${errorText}`);
      }
      result = {
        success: true,
        messageId: `ms-${Date.now()}`,
        provider: 'microsoft',
        data: {
          status: sendResponse.status
        }
      };
      console.log('Email sent successfully via Microsoft Graph');
    } else {
      throw new Error(`Provider ${selectedProvider} not supported`);
    }
    return new Response(JSON.stringify(result), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('Error in send-email function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }
});
