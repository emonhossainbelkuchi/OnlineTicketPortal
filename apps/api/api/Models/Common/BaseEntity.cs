using System;

namespace TicketPortal.Api.Models.Common
{
    // Every table in the whole system starts from this. It only gives each row one thing:
    // a unique ID (a GUID, not a plain number). We use GUIDs instead of 1,2,3... because
    // many different operators and services will be creating records at the same time,
    // and GUIDs can never clash with each other even if two rows are created in the same
    // instant on different servers.
    public abstract class BaseEntity
    {
        // The unique ID of this row. Generated automatically the moment the object is created,
        // so it already has a real ID even before it's saved to the database.
        public Guid Id { get; set; } = Guid.NewGuid();
    }
}
