import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ThreatAlertRequest {
  email: string;
  threatType: string;
  severity: string;
  sourceIp: string;
  destinationIp: string;
  timestamp: string;
  description: string;
  confidenceScore: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      email,
      threatType,
      severity,
      sourceIp,
      destinationIp,
      timestamp,
      description,
      confidenceScore
    }: ThreatAlertRequest = await req.json();

    const severityColor = severity === 'Critical' ? '#ef4444' : severity === 'High' ? '#f97316' : '#eab308';
    const severityIcon = severity === 'Critical' ? '🚨' : '⚠️';

    const emailResponse = await resend.emails.send({
      from: "CyberDefense Pro <alerts@resend.dev>",
      to: [email],
      subject: `${severityIcon} ${severity} Threat Detected - ${threatType}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif; background-color: #f5f5f5; padding: 20px; }
              .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white; padding: 30px; text-align: center; }
              .alert-badge { display: inline-block; padding: 8px 16px; background-color: ${severityColor}; color: white; border-radius: 20px; font-weight: bold; font-size: 14px; margin-top: 10px; }
              .content { padding: 30px; }
              .threat-info { background-color: #f8fafc; border-left: 4px solid ${severityColor}; padding: 20px; margin: 20px 0; border-radius: 4px; }
              .info-row { display: flex; justify-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
              .info-label { font-weight: 600; color: #64748b; }
              .info-value { color: #0f172a; font-family: 'Courier New', monospace; }
              .description { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
              .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
              .confidence { font-size: 24px; font-weight: bold; color: ${severityColor}; text-align: center; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0; font-size: 28px;">${severityIcon} Security Alert</h1>
                <div class="alert-badge">${severity} Threat Detected</div>
              </div>
              
              <div class="content">
                <h2 style="color: #0f172a; margin-top: 0;">${threatType} Attack</h2>
                
                <div class="confidence">
                  ${confidenceScore}% Confidence
                </div>

                <div class="threat-info">
                  <div class="info-row">
                    <span class="info-label">Source IP:</span>
                    <span class="info-value">${sourceIp}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Destination IP:</span>
                    <span class="info-value">${destinationIp}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Detected At:</span>
                    <span class="info-value">${new Date(timestamp).toLocaleString()}</span>
                  </div>
                  <div class="info-row" style="border-bottom: none;">
                    <span class="info-label">Threat Type:</span>
                    <span class="info-value">${threatType}</span>
                  </div>
                </div>

                <div class="description">
                  <strong>Description:</strong><br/>
                  ${description}
                </div>

                <p style="color: #64748b; font-size: 14px; line-height: 1.6;">
                  This is an automated alert from your CyberDefense Pro threat detection system. 
                  The threat has been logged and appropriate security measures have been initiated.
                </p>

                <div style="text-align: center; margin-top: 30px;">
                  <a href="#" style="display: inline-block; background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                    View Full Report
                  </a>
                </div>
              </div>
              
              <div class="footer">
                <p style="margin: 5px 0;">CyberDefense Pro - Real-Time Threat Detection System</p>
                <p style="margin: 5px 0;">© 2025 All rights reserved</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (emailResponse.error) {
      throw emailResponse.error;
    }

    console.log("Threat alert email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending threat alert:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
