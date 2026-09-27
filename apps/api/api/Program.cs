using TicketPortal.Api.Authorization;
using TicketPortal.Api.Data;
using TicketPortal.Api.Models.Identity;
using TicketPortal.Api.Services;

using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc.Formatters;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;

using System.Security.Claims;
using System.Text;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);


// ============================================================
// 1. DbContext
// ============================================================

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection")
    ));


// ============================================================
// 2. Identity
// ============================================================

builder.Services.AddIdentity<ApplicationUser, ApplicationRole>(options =>
{
    options.Password.RequiredLength = 6;
    options.User.RequireUniqueEmail = true;

    // Piece 4: brute-force protection. Before this, AccountController.Login only ever
    // returned a plain 401 no matter how many times a password was guessed — nothing ever
    // slowed an attacker down. Five wrong attempts now locks the account for 15 minutes
    // regardless of how many more guesses arrive during that window; see
    // AccountController.Login for where this actually gets enforced
    // (IsLockedOutAsync / AccessFailedAsync / ResetAccessFailedCountAsync).
    options.Lockout.MaxFailedAccessAttempts = 5;
    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
    options.Lockout.AllowedForNewUsers = true;
})
.AddEntityFrameworkStores<AppDbContext>()
.AddDefaultTokenProviders();


// ============================================================
// 2a. Fail fast on a missing/placeholder/short JWT signing key
// ============================================================
// RBAC Amendment v3 / Chunk 1 task 2: appsettings.json no longer ships a working key (see its
// JWT section). Development gets a real, non-secret one from appsettings.Development.json, so
// it's exempt here — everywhere else (Production, any shared/staging environment, or a grader
// running with ASPNETCORE_ENVIRONMENT unset to something other than Development) must supply a
// real key via user-secrets or the JWT__SigningKey environment variable, or the API refuses to
// start at all rather than silently issue tokens nobody can trust.
if (!builder.Environment.IsDevelopment())
{
    var signingKey = builder.Configuration["JWT:SigningKey"];
    var looksLikeAPlaceholder = string.IsNullOrWhiteSpace(signingKey)
        || signingKey.Length < 32
        || signingKey.Contains("ReplaceThisWith", StringComparison.OrdinalIgnoreCase)
        || signingKey.Contains("Development-Only", StringComparison.OrdinalIgnoreCase);

    if (looksLikeAPlaceholder)
    {
        throw new InvalidOperationException(
            "JWT:SigningKey is missing, a placeholder, or shorter than 32 characters. Set a real " +
            "value via 'dotnet user-secrets set \"JWT:SigningKey\" \"...\"' or the JWT__SigningKey " +
            "environment variable before starting the API outside Development. See " +
            "SETUP_AND_DEMO_GUIDE.md, \"First-time secrets setup\".");
    }
}

// ============================================================
// 3. JWT Authentication
// ============================================================

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme =
        JwtBearerDefaults.AuthenticationScheme;

    options.DefaultChallengeScheme =
        JwtBearerDefaults.AuthenticationScheme;

    options.DefaultScheme =
        JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,

        ValidIssuer =
            builder.Configuration["JWT:Issuer"],

        ValidateAudience = true,

        ValidAudience =
            builder.Configuration["JWT:Audience"],

        ValidateIssuerSigningKey = true,

        IssuerSigningKey =
            new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(
                    builder.Configuration["JWT:SigningKey"]!
                )
            )
    };

    // A token's signature stays valid until it expires, even after the account it was issued
    // for is gone. Typical case in development: the local database is dropped/re-created
    // (fresh seed = fresh user ids) while the browser still holds yesterday's token. The API
    // then "authenticated" a user that no longer exists, and the first write that stored that
    // user id (e.g. POST /api/seatholds -> FK_SeatHolds_AspNetUsers_HeldByUserId) failed with
    // a confusing "referenced records may no longer exist". Also closes the gap where a
    // deactivated account (IsActive = false) kept working until its token expired.
    // Failing here returns a plain 401, which both front-ends already turn into "log in again".
    options.Events = new JwtBearerEvents
    {
        OnTokenValidated = async context =>
        {
            var userIdClaim = context.Principal?.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userIdClaim, out var userId))
            {
                context.Fail("The token does not carry a valid user id.");
                return;
            }

            var userManager = context.HttpContext.RequestServices
                .GetRequiredService<UserManager<ApplicationUser>>();
            var user = await userManager.FindByIdAsync(userId.ToString());
            if (user is null || !user.IsActive)
            {
                context.Fail("The account for this token no longer exists or has been disabled.");
            }
        }
    };
});


builder.Services.AddAuthorization();


// ============================================================
// 4. CORS (Angular frontend)
// ============================================================

// Angular runs on its own origin (e.g. http://localhost:4200 while you're developing it),
// which is different from this API's origin — without a CORS policy, the BROWSER itself
// blocks Angular's HttpClient calls before they ever reach a controller, no matter how
// correct the backend code is. The allowed origins come from appsettings ("Cors:AllowedOrigins")
// instead of AllowAnyOrigin(), so only frontends you actually trust can call this API — add
// your deployed Angular URL to that list once you have one, no code change needed.
const string AngularClientPolicy = "AngularClient";

var corsAllowedOrigins =
    builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? [];

builder.Services.AddCors(options =>
{
    options.AddPolicy(AngularClientPolicy, policy =>
    {
        policy
            .WithOrigins(corsAllowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();

        // Left off on purpose: this API authenticates with a JWT sent as a normal
        // Authorization header (not a cookie), so the browser doesn't need "credentials"
        // mode for that to work. Only turn this on if Angular ever needs to send cookies
        // (e.g. an HttpOnly refresh-token cookie) — and if you do, WithOrigins can no longer
        // contain "*", since CORS forbids combining AllowCredentials with AllowAnyOrigin.
        // .AllowCredentials();
    });
});


// ============================================================
// 5. Application Services
// ============================================================

// RBAC Amendment v3, Chunk 2 P0 task 2 — one resolved actor + permission set per request.
builder.Services.AddScoped<ICurrentActorService, CurrentActorService>();
builder.Services.AddScoped<SeatHoldService>();
builder.Services.AddScoped<FinanceLedgerService>();
builder.Services.AddScoped<CustomerWalletService>();
// Orchestrates SeatHoldService + FinanceLedgerService for the online payment-confirmation
// flow — see Services/PaymentConfirmationService.cs.
builder.Services.AddScoped<PaymentConfirmationService>();
// Orchestrates FinanceLedgerService + CustomerWalletService for the refund workflow — see
// Services/RefundProcessingService.cs.
builder.Services.AddScoped<RefundProcessingService>();
// Owns the CancellationRequest workflow (Request -> Approve/Reject -> Complete), creating the
// Refund row on approval and handing it off to RefundProcessingService from there — see
// Services/CancellationProcessingService.cs.
builder.Services.AddScoped<CancellationProcessingService>();
// Chunk 5 — orchestrates SeatHoldService + CancellationProcessingService +
// RefundProcessingService for the trip-cancel cascade (status/history, hold release, and a
// full no-fee refund per affected booking) — see Services/TripCancellationService.cs.
builder.Services.AddScoped<TripCancellationService>();
// Settlement/payout/invoice batch — see Services/SettlementGenerationService.cs,
// Services/PayoutProcessingService.cs, Services/InvoicePaymentService.cs.
builder.Services.AddScoped<SettlementGenerationService>();
builder.Services.AddScoped<PayoutProcessingService>();
builder.Services.AddScoped<InvoicePaymentService>();
// RBAC Amendment v3, Chunk 7 task 4 — "confirmed bookings with no ledger rows" reconciliation
// list + safe re-post action. See Services/FinanceReconciliationService.cs.
builder.Services.AddScoped<FinanceReconciliationService>();
// The only writer of CouponUsage — validates a coupon's own rules before redemption. See
// Services/CouponRedemptionService.cs.
builder.Services.AddScoped<CouponRedemptionService>();
builder.Services.AddScoped<IPasswordResetMessageSender, PasswordResetMessageSender>();

builder.Services.AddHostedService<SeatHoldExpirySweepService>();
// Piece 3: finds payments that succeeded but whose booking/tickets never got finalized, and
// flags them for manual reconciliation instead of leaving them silently stuck — see
// Services/PaymentReconciliationSweepService.cs.
builder.Services.AddHostedService<PaymentReconciliationSweepService>();

// Piece 7 (concept doc §3.2): the "call the operator's API to sync and check booking status"
// engine for API-connected operators — see Services/ExternalBookingSyncService.cs and
// Services/ExternalBookingSyncSweepService.cs. Typed-client registration so HttpClient arrives
// pooled/managed by IHttpClientFactory instead of the service newing one up itself.
builder.Services.AddHttpClient<ExternalBookingSyncService>();
builder.Services.AddHostedService<ExternalBookingSyncSweepService>();


// ============================================================
// 6. Controllers + Swagger
// ============================================================

// Every status/type enum in this API (BookingStatus, PaymentStatus, TripStatus, ...) would
// otherwise serialize as its raw underlying int (e.g. "status": 3), forcing the frontend to
// hardcode number->label maps that silently break if an enum is ever reordered or extended.
// JsonStringEnumConverter makes both directions (serialize AND model-binding a request body)
// use the enum member's name instead, e.g. "status": "Confirmed". Swagger UI's example/schema
// values pick this up too, since it's registered on the same JsonSerializerOptions Swashbuckle
// reads from.
// RemoveType<StringOutputFormatter>() matters: without it, any action that
// returns a bare C# string (e.g. AccountController.Register's success path,
// StatusCode(201, someInterpolatedString)) gets serialized as raw text/plain
// instead of JSON. Swagger UI doesn't care and just shows you whatever came
// back, so this looked fine there - but Angular's HttpClient always tries to
// JSON.parse a 'json' responseType body, so an unquoted plain-text string
// throws a SyntaxError there instead of surfacing the real message.
// Removing this formatter forces every string return value through the JSON
// formatter instead, so it comes back properly quoted like every other
// response from this API already does.
builder.Services.AddControllers(options =>
    {
        options.OutputFormatters.RemoveType<StringOutputFormatter>();
    })
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "TicketPortal API",
        Version = "v1"
    });

    // Defines the "Bearer" scheme so Swagger UI renders an Authorize button.
    // Type = Http + Scheme = "bearer" means Swashbuckle prepends "Bearer " for you —
    // paste ONLY the raw token here, not "Bearer <token>", or requests will send
    // "Bearer Bearer <token>" and every call will 401.
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        Description = "Paste the raw token you got back from POST /api/account/login. " +
                      "Do not type \"Bearer \" yourself — Swagger adds that prefix automatically."
    });

    // Applies the "Bearer" requirement globally so every endpoint's padlock icon in Swagger UI
    // actually sends the Authorization header once you've clicked Authorize — without this,
    // the button shows up but tokens never get attached to requests.
    // Swashbuckle.AspNetCore v10+ (which this project uses) changed this API: AddSecurityRequirement
    // now takes a Func<OpenApiDocument, OpenApiSecurityRequirement>, and OpenApiSecurityScheme no
    // longer has a .Reference property — you build an OpenApiSecuritySchemeReference instead.
    options.AddSecurityRequirement(document => new OpenApiSecurityRequirement
    {
        [new OpenApiSecuritySchemeReference("Bearer", document)] = []
    });
});


var app = builder.Build();


// ============================================================
// 6.5. Global Exception Handling
// ============================================================

// This has to be one of the very first things registered so it wraps every other middleware
// and every controller below it. Before this existed, any exception a controller didn't
// explicitly catch (like the DbUpdateException from SeatHoldService hitting a bad tripId)
// propagated all the way up as a raw, "User-Unhandled" crash instead of a clean response.
// Known/expected exception types get a specific status code; anything truly unexpected still
// gets a safe generic 500.
//
// The full exception (stack trace, file paths, line numbers) is ALWAYS logged server-side via
// ILogger and NEVER put in the HTTP response body — not even in Development. It used to be
// included when app.Environment.IsDevelopment() was true, which meant anyone watching the
// network tab, Swagger, or a frontend that just prints the error text (which is the default
// launchSettings.json environment) would see raw C# internals. Logging still gives you every
// detail you need while debugging — just check the console/log output instead of the response.
app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        var exception = context.Features.Get<IExceptionHandlerFeature>()?.Error;

        var (statusCode, message) = exception switch
        {
            SeatsUnavailableException ex => (StatusCodes.Status409Conflict, ex.Message),
            ArgumentException ex => (StatusCodes.Status400BadRequest, ex.Message),
            InvalidOperationException ex => (StatusCodes.Status400BadRequest, ex.Message),
            DbUpdateException => (StatusCodes.Status500InternalServerError,
                "A database error occurred while saving your changes."),
            _ => (StatusCodes.Status500InternalServerError,
                "An unexpected error occurred. Please try again.")
        };

        if (exception is not null)
        {
            app.Logger.LogError(exception,
                "Unhandled exception while processing {Method} {Path}",
                context.Request.Method, context.Request.Path);
        }

        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";

        await context.Response.WriteAsJsonAsync(new { message });
    });
});


// ============================================================
// 7. Database Migration + Seeder
// ============================================================

using (var scope = app.Services.CreateScope())
{
    var db =
        scope.ServiceProvider.GetRequiredService<AppDbContext>();

    var roleManager =
        scope.ServiceProvider.GetRequiredService<RoleManager<ApplicationRole>>();

    var userManager =
        scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

    var startupLogger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

    // Unguarded before: if SQL Server/LocalDB wasn't reachable when the app started, this
    // failed with a raw, unhandled crash dump in the console and the app never came up — no
    // clear indication of WHY. The app still can't do anything useful without its database, so
    // this still fails fast (rethrows), but now with one obvious, human-readable line telling
    // you exactly what to check instead of a wall of stack trace.
    try
    {
        await db.Database.MigrateAsync();

        await DbSeeder.SeedReferenceDataAsync(db);

        // Piece 1: real roles + a bootstrap Admin account. Must run in this order — the Admin
        // user's role assignment below depends on the "Admin" role already existing.
        await DbSeeder.SeedRolesAsync(roleManager);
        // Development: also repairs a stale/locked/re-passworded "admin" row left in a reused
        // local database (see DbSeeder.SeedAdminUserAsync). Never true in Production, so a
        // real admin's rotated password is never reset.
        await DbSeeder.SeedAdminUserAsync(
            userManager,
            startupLogger,
            repairDevelopmentCredentials: app.Environment.IsDevelopment());

        // Rich demo dataset (operators, fleets, staff, trips, bookings, the finance cycle,
        // marketing, integrations, etc.) so the whole app can be clicked through end-to-end.
        // Only runs in Development, and only if BusOperators is still empty - see
        // DemoDataSeeder.SeedAsync for the exact guard.
        if (app.Environment.IsDevelopment())
        {
            await DemoDataSeeder.SeedAsync(db, userManager, app.Configuration);
        }
    }
    catch (Exception ex)
    {
        startupLogger.LogCritical(ex,
            "Startup failed while migrating/seeding the database. " +
            "Is SQL Server / LocalDB running and is the connection string in appsettings.json correct?");
        throw;
    }
}


// ============================================================
// 8. wwwroot / images folder
// ============================================================

if (app.Environment.WebRootPath == null)
{
    app.Environment.WebRootPath =
        Path.Combine(
            app.Environment.ContentRootPath,
            "wwwroot"
        );
}


// Create wwwroot folder
Directory.CreateDirectory(
    app.Environment.WebRootPath!
);


// Create wwwroot/images folder
Directory.CreateDirectory(
    Path.Combine(
        app.Environment.WebRootPath!,
        "images"
    )
);


// ============================================================
// 9. Static File Provider
// ============================================================

// Important:
// WebRootPath and WebRootFileProvider both are configured

app.Environment.WebRootFileProvider =
    new PhysicalFileProvider(
        app.Environment.WebRootPath!
    );


// ============================================================
// 10. Static File Content Types
// ============================================================

// WebP, JPG, JPEG, PNG etc. to support it.

var contentTypeProvider =
    new Microsoft.AspNetCore.StaticFiles.FileExtensionContentTypeProvider();


// Common image types
contentTypeProvider.Mappings[".jpg"] = "image/jpeg";
contentTypeProvider.Mappings[".jpeg"] = "image/jpeg";
contentTypeProvider.Mappings[".png"] = "image/png";
contentTypeProvider.Mappings[".gif"] = "image/gif";
contentTypeProvider.Mappings[".webp"] = "image/webp";
contentTypeProvider.Mappings[".bmp"] = "image/bmp";
contentTypeProvider.Mappings[".svg"] = "image/svg+xml";


// ============================================================
// 11. Swagger
// ============================================================

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();

    app.UseSwaggerUI(options =>
    {
        // Keeps your pasted token in the browser after a page refresh, so you don't have to
        // click Authorize and paste it again every time you reload Swagger UI while testing.
        options.EnablePersistAuthorization();
    });
}


// ============================================================
// 12. HTTPS
// ============================================================

app.UseHttpsRedirection();


// ============================================================
// 13. Static Files
// ============================================================

app.UseStaticFiles(
    new StaticFileOptions
    {
        FileProvider =
            new PhysicalFileProvider(
                app.Environment.WebRootPath!
            ),

        ContentTypeProvider =
            contentTypeProvider
    }
);


// ============================================================
// 14. CORS
// ============================================================

// Must run before UseAuthentication/UseAuthorization/MapControllers. Before Angular's real
// request, the browser first sends a "preflight" OPTIONS request to check the CORS policy —
// that preflight carries no JWT, so if UseCors ran any later than this, the preflight itself
// would get rejected and Angular would never even get to send the real, authenticated request.
app.UseCors(AngularClientPolicy);


// ============================================================
// 15. Authentication
// ============================================================

app.UseAuthentication();


// ============================================================
// 16. Authorization
// ============================================================

app.UseAuthorization();


// ============================================================
// 17. Controllers
// ============================================================

app.MapControllers();


// ============================================================
// 18. Run
// ============================================================

app.Run();

// Chunk 10 P0 task 2: top-level statements generate an internal Program class, which
// Microsoft.AspNetCore.Mvc.Testing's WebApplicationFactory<TEntryPoint> cannot reference from
// a separate test assembly. This partial declaration is the standard, additive fix — it does
// not change anything about how the app starts, only what the test project is allowed to see.
public partial class Program { }
