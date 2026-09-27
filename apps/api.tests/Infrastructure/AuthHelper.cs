using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace TicketPortal.Api.Tests.Infrastructure
{
    // Every test authenticates through the real POST /api/account/login endpoint — same as
    // the plan requires ("Do not accept tests that invoke a controller method directly, mint
    // a JWT by hand, or bypass [Authorize]"). This only saves each test from repeating the
    // HTTP call and JSON parsing.
    public static class AuthHelper
    {
        private sealed class LoginResponse
        {
            public string Token { get; set; } = string.Empty;
        }

        public static async Task<string> LoginAsync(this HttpClient client, string userName, string password)
        {
            var response = await client.PostAsJsonAsync("/api/account/login", new { UserName = userName, Password = password });
            response.EnsureSuccessStatusCode();

            var body = await response.Content.ReadFromJsonAsync<LoginResponse>(
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            return body?.Token ?? throw new InvalidOperationException(
                $"Login for '{userName}' returned 200 but no Token field — has AuthResponseDto changed shape?");
        }

        // Returns a NEW HttpClient (from the same factory) with the bearer token already
        // attached, so a test never has to touch DefaultRequestHeaders itself.
        public static async Task<HttpClient> CreateAuthenticatedClientAsync(
            this TicketPortalWebApplicationFactory factory, string userName, string password)
        {
            var anonymousClient = factory.CreateClient();
            var token = await anonymousClient.LoginAsync(userName, password);

            var authedClient = factory.CreateClient();
            authedClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            return authedClient;
        }
    }
}
