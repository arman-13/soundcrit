using Resend;

namespace Backend.Services;

public class EmailService
{
    private readonly IResend _resend;
    private readonly string _from;
    private readonly string _appUrl;

    public EmailService(IResend resend, IConfiguration config)
    {
        _resend = resend;
        _from = config["Resend:From"] ?? "studio@soundcrit.com";
        _appUrl = config["AppUrl"] ?? "https://soundcrit.com";
    }

    public async Task SendEmailVerificationAsync(string toEmail, string displayName, string token)
    {
        var link = $"{_appUrl}/verify-email?token={Uri.EscapeDataString(token)}&email={Uri.EscapeDataString(toEmail)}";
        var message = new EmailMessage
        {
            From = _from,
            To = { toEmail },
            Subject = "Verify your Soundcrit email",
            HtmlBody = EmailTemplate("Verify your email", $@"
                <p>Hey {displayName},</p>
                <p>Thanks for signing up. Click the button below to verify your email address.</p>
                <a href=""{link}"" style=""display:inline-block;padding:12px 28px;background:#fff;color:#000;text-decoration:none;border-radius:6px;font-weight:600;margin:16px 0;"">Verify Email</a>
                <p style=""color:#666;font-size:13px;"">This link expires in 24 hours. If you didn't create an account, you can ignore this email.</p>
            "),
        };
        await _resend.EmailSendAsync(message);
    }

    public async Task SendPasswordResetAsync(string toEmail, string displayName, string token)
    {
        var link = $"{_appUrl}/reset-password?token={Uri.EscapeDataString(token)}&email={Uri.EscapeDataString(toEmail)}";
        var message = new EmailMessage
        {
            From = _from,
            To = { toEmail },
            Subject = "Reset your Soundcrit password",
            HtmlBody = EmailTemplate("Reset your password", $@"
                <p>Hey {displayName},</p>
                <p>We received a request to reset your password. Click the button below to choose a new one.</p>
                <a href=""{link}"" style=""display:inline-block;padding:12px 28px;background:#fff;color:#000;text-decoration:none;border-radius:6px;font-weight:600;margin:16px 0;"">Reset Password</a>
                <p style=""color:#666;font-size:13px;"">This link expires in 1 hour. If you didn't request a password reset, you can ignore this email.</p>
            "),
        };
        await _resend.EmailSendAsync(message);
    }

    private static string EmailTemplate(string heading, string body) => $@"
<!DOCTYPE html>
<html>
<head><meta charset=""utf-8""></head>
<body style=""margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;"">
  <table width=""100%"" cellpadding=""0"" cellspacing=""0"">
    <tr><td align=""center"" style=""padding:48px 16px;"">
      <table width=""480"" cellpadding=""0"" cellspacing=""0"" style=""background:#111;border-radius:12px;overflow:hidden;"">
        <tr><td style=""padding:32px 40px 0;"">
          <p style=""margin:0;font-size:13px;letter-spacing:0.15em;text-transform:uppercase;color:#666;"">SOUNDCRIT</p>
          <h1 style=""margin:12px 0 24px;font-size:22px;font-weight:500;color:#fff;"">{heading}</h1>
          <div style=""color:#aaa;font-size:15px;line-height:1.6;"">{body}</div>
        </td></tr>
        <tr><td style=""padding:32px 40px;border-top:1px solid #222;margin-top:32px;"">
          <p style=""margin:0;font-size:12px;color:#444;"">© 2025 Soundcrit. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>";
}
