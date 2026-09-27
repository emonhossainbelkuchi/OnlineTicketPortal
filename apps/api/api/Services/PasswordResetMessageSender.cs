using System.Net;
using System.Net.Mail;
using TicketPortal.Api.Models.Identity;

namespace TicketPortal.Api.Services;

public interface IPasswordResetMessageSender
{
    Task SendAsync(ApplicationUser user, string resetUrl);
}

/// <summary>
/// Sends reset links over configured SMTP. In a developer machine with SMTP intentionally
/// unconfigured it logs the link instead, making the whole recovery flow testable without
/// embedding credentials in source control. Production must configure PasswordReset:Smtp:Host.
/// </summary>
public sealed class PasswordResetMessageSender(
    IConfiguration configuration,
    ILogger<PasswordResetMessageSender> logger) : IPasswordResetMessageSender
{
    public async Task SendAsync(ApplicationUser user, string resetUrl)
    {
        var host = configuration["PasswordReset:Smtp:Host"];
        if (string.IsNullOrWhiteSpace(host))
        {
            logger.LogWarning(
                "SMTP is not configured. Development password reset link for {Email}: {ResetUrl}",
                user.Email, resetUrl);
            return;
        }

        var port = configuration.GetValue<int?>("PasswordReset:Smtp:Port") ?? 587;
        using var client = new SmtpClient(host, port)
        {
            EnableSsl = configuration.GetValue("PasswordReset:Smtp:UseSsl", true)
        };

        var username = configuration["PasswordReset:Smtp:Username"];
        var password = configuration["PasswordReset:Smtp:Password"];
        if (!string.IsNullOrWhiteSpace(username))
        {
            client.Credentials = new NetworkCredential(username, password);
        }

        var fromAddress = configuration["PasswordReset:Smtp:FromAddress"]
            ?? "no-reply@ticketportal.local";
        var message = new MailMessage(fromAddress, user.Email!)
        {
            Subject = "Reset your TicketPortal password",
            Body = $"Hello {user.FullName},\n\nUse this one-time link to choose a new TicketPortal password:\n{resetUrl}\n\nIf you did not ask to reset your password, you can ignore this email.",
            IsBodyHtml = false
        };

        await client.SendMailAsync(message);
    }
}
