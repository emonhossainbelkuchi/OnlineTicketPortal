using System.Security.Claims;

namespace TicketPortal.Api.Authorization
{
    // RBAC Amendment v3: "a shared authorization service/resource-check pattern" every
    // controller goes through instead of reimplementing IsInRole/CanManageOperatorAsync
    // checks by hand. Registered Scoped (Program.cs) so one resolved CurrentActor is reused
    // for the whole request instead of re-querying the database every time a controller
    // action asks "who is this and what can they do".
    public interface ICurrentActorService
    {
        Task<CurrentActor> ResolveAsync(ClaimsPrincipal user);
    }
}
