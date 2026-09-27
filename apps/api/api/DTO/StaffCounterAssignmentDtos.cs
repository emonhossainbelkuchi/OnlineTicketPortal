using System.ComponentModel.DataAnnotations;

namespace TicketPortal.Api.DTO
{
    // RBAC Amendment v3 task 4. Which counter a CounterStaff member may sell from —
    // see StaffSalesCounterAssignment's own doc comment for why this exists.
    public class StaffSalesCounterAssignmentCreateDto
    {
        [Required]
        public Guid StaffProfileId { get; set; }

        [Required]
        public Guid SalesCounterId { get; set; }

        public DateTime? EffectiveFromUtc { get; set; }
        public DateTime? EffectiveToUtc { get; set; }
    }

    public class StaffSalesCounterAssignmentResponseDto
    {
        public Guid Id { get; set; }
        public Guid StaffProfileId { get; set; }
        public Guid SalesCounterId { get; set; }
        public bool IsActive { get; set; }
        public DateTime? EffectiveFromUtc { get; set; }
        public DateTime? EffectiveToUtc { get; set; }
        public DateTime CreatedAtUtc { get; set; }
        public DateTime? UpdatedAtUtc { get; set; }
        public byte[] RowVersion { get; set; } = Array.Empty<byte>();
    }
}
