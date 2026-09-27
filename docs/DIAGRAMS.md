# Diagrams — Chunk 10

Scoped to the flows this pass actually traced through the real source (seat holds, check-in,
finance/settlement, and the layered architecture) — not a full ERD of all ~84 models, which
would need a dedicated pass to verify accurately rather than guess at from partial reads.

## System architecture (high level)

```mermaid
flowchart TB
    subgraph Clients
        Angular[Angular app<br/>customer + most operator UI]
        React[React app<br/>Platform Admin dashboard + analytics]
    end

    Angular -->|HTTPS + JWT| API
    React -->|HTTPS + JWT| API

    subgraph API[ASP.NET Core Web API]
        Controllers[Controllers<br/>authz via CurrentActorService + Permissions]
        Services[Domain services<br/>SeatHoldService, PaymentConfirmationService,<br/>FinanceLedgerService, SettlementGenerationService, ...]
        Controllers --> Services
    end

    Services --> DB[(SQL Server<br/>EF Core)]
    Services -.->|Payments:DemoMode=false only| Gateway[Payment gateway]
```

## Seat hold lifecycle (verified via `apps/api.tests/Integration/SeatHold*Tests.cs`)

```mermaid
sequenceDiagram
    participant C as Customer (2 tabs)
    participant API as SeatHoldsController
    participant Svc as SeatHoldService
    participant DB as TripSeats / SeatHolds

    C->>API: POST /api/seatholds (seat X) — request A
    C->>API: POST /api/seatholds (seat X) — request B
    par Concurrent
        API->>Svc: HoldSeatsAsync (A)
        Svc->>DB: UPDATE TripSeat SET Status=Held WHERE Status=Available
        DB-->>Svc: 1 row affected
        Svc-->>API: SeatHold created
        API-->>C: 201 Created (A)
    and
        API->>Svc: HoldSeatsAsync (B)
        Svc->>DB: UPDATE TripSeat SET Status=Held WHERE Status=Available
        DB-->>Svc: 0 rows affected
        Svc-->>API: SeatsUnavailableException
        API-->>C: 409 Conflict (B)
    end

    Note over Svc,DB: 3-5 minutes pass, payment never completes
    loop Background sweep (SeatHoldExpirySweepService)
        Svc->>DB: Find Active holds where HoldExpiresAtUtc <= now
        Svc->>DB: Seat -> Available, Hold -> Expired, Draft/PendingPayment Booking -> Expired
    end
    Note over DB: Seat is immediately holdable again
```

## Online sale → refund → settlement (verified via `FinanceLedgerServiceTests` / `SettlementGenerationServiceTests`)

```mermaid
sequenceDiagram
    participant Pay as PaymentConfirmationService
    participant Ledger as FinanceLedgerService
    participant Wallet as OperatorWallet
    participant Settle as SettlementGenerationService

    Pay->>Ledger: PostOnlineSaleAsync(booking, operator, gross=1000, commission=100, gateway=20)
    Ledger->>Wallet: PendingSettlementBalance += 880 (1000-100-20)
    Note over Ledger: 3 PlatformLedger rows: OnlineTicketSale(+1000), PlatformCommission(-100), GatewayCharge(-20)

    Pay->>Ledger: PostRefundAsync(booking, operator, 120)
    Ledger->>Wallet: PendingSettlementBalance -= 120

    Settle->>Settle: GenerateSettlementAsync(operator, fromDate, toDate)
    Note over Settle: netAmount = sum(credit - debit) over unsettled rows in range
    alt netAmount > 0
        Settle->>Wallet: AvailablePayoutBalance += netAmount
    else netAmount < 0
        Settle->>Settle: raise OperatorInvoice(amount = -netAmount)
    end
    Settle->>Wallet: PendingSettlementBalance -= netAmount
    Settle->>Ledger: stamp OperatorSettlementId on every row just settled
```

## Authorization resolution (`CurrentActorService` / `PermissionMatrix`)

```mermaid
flowchart LR
    Token[JWT: NameIdentifier + Role claims] --> Resolve[CurrentActorService.ResolveAsync]
    Resolve --> Lookup{StaffProfile exists<br/>for this user?}
    Lookup -->|No| Customer[ActorType.Customer<br/>zero staff permissions]
    Lookup -->|Yes| StaffType{BusOperatorId?}
    StaffType -->|null| PlatformStaff[Platform-scoped<br/>PermissionMatrix.PlatformScope Role]
    StaffType -->|set| OperatorStaff[Operator-scoped<br/>PermissionMatrix.OperatorScope Role]
    PlatformStaff --> Perms[actor.HasPermission / actor.CanManageOperator]
    OperatorStaff --> Perms
    Customer --> Perms
```

## Not covered here

A full entity-relationship diagram of the ~84 models was not attempted this pass — a
diagram built from a partial read of the schema risks being confidently wrong in exactly the
way that misleads someone using it as a reference. If a full ERD is wanted, it should be
generated from the actual EF model (e.g. via `dotnet ef dbcontext info` / a proper
schema-diagram tool run against a real migrated database) rather than hand-drawn.
