namespace TicketPortal.Api.Services
{
    // Piece 6: not implemented or registered in DI yet — this exists purely so that wiring in a
    // real payment gateway later is a drop-in (write one concrete class, register it in
    // Program.cs, call it from a new /webhooks/payments/{provider} endpoint) instead of a
    // rewrite of PaymentConfirmationService.
    //
    // Today, ConfirmOnlinePaymentAsync just trusts whatever the caller says the gateway
    // returned (see the TODO on PaymentsController.Confirm, and the Payments:DemoMode tag it
    // now stamps onto every confirmation's GatewayResponseJson so that's visible on the record).
    // Once a real gateway is wired in:
    //   - Add a concrete implementation of this interface for that specific gateway (the exact
    //     shape of "signature" depends entirely on which one — a header HMAC, a signed JSON
    //     body, etc.).
    //   - Register it in Program.cs and inject it into the new webhook endpoint.
    //   - Move confirmation off the client-callable POST /{id}/confirm and into that webhook,
    //     which calls VerifyAsync BEFORE ever calling ConfirmOnlinePaymentAsync — a client
    //     should never again be able to just assert "the gateway said yes."
    public interface IPaymentGatewayVerifier
    {
        // transactionId: the gateway's own reference for this payment attempt.
        // signature: whatever that specific gateway sends to prove the payload is genuinely
        // theirs. Returns true only once that's been checked and the transaction is confirmed
        // as genuinely paid — never based on the transactionId alone.
        Task<bool> VerifyAsync(string transactionId, string signature);
    }
}
