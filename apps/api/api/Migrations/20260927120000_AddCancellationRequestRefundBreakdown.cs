using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TicketPortal.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCancellationRequestRefundBreakdown : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // These four columns are a snapshot, taken at request time, of what
            // RequestedRefundAmount was actually computed from — see the field comments on
            // CancellationRequest.cs. Existing rows get a safe default (0 / null) rather than
            // a backfill, since the real BaseAmount/GrandTotal at the time those older
            // requests were made can no longer be reconstructed reliably once tickets have
            // since been cancelled/refunded or the booking's totals have changed.
            migrationBuilder.AddColumn<decimal>(
                name: "BaseAmount",
                table: "CancellationRequests",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "BookingGrandTotalAtRequest",
                table: "CancellationRequests",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "AppliedRefundPercentage",
                table: "CancellationRequests",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "AppliedFixedCancellationFee",
                table: "CancellationRequests",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "AppliedFixedCancellationFee", table: "CancellationRequests");
            migrationBuilder.DropColumn(name: "AppliedRefundPercentage", table: "CancellationRequests");
            migrationBuilder.DropColumn(name: "BookingGrandTotalAtRequest", table: "CancellationRequests");
            migrationBuilder.DropColumn(name: "BaseAmount", table: "CancellationRequests");
        }
    }
}
