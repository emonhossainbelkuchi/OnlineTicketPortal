using Microsoft.AspNetCore.Mvc;

namespace TicketPortal.Api.Extensions
{
    // Shared image-upload validation, used by every controller with an image upload endpoint
    // (Bus, BusOperator, Trip, CancellationPolicy, Booking passenger photo). Before this
    // existed, only TripsController checked file type/size — the other four accepted anything
    // as long as it wasn't empty, so a client could upload a huge file or a non-image straight
    // into wwwroot/images. Centralized here so all five endpoints stay in sync going forward.
    public static class FileUploadValidation
    {
        private static readonly string[] AllowedImageExtensions =
        {
            ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"
        };

        private const long MaxImageBytes = 5 * 1024 * 1024; // 5 MB

        // Returns null when the file is valid; otherwise an IActionResult ready to return
        // directly from the controller (BadRequest with a clear, user-facing message).
        public static IActionResult? Validate(IFormFile? file)
        {
            if (file == null || file.Length == 0)
            {
                return new BadRequestObjectResult(new { message = "No image uploaded." });
            }

            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!AllowedImageExtensions.Contains(extension))
            {
                return new BadRequestObjectResult(new
                {
                    message = "Only JPG, JPEG, PNG, GIF, WEBP and BMP images are allowed."
                });
            }

            if (file.Length > MaxImageBytes)
            {
                return new BadRequestObjectResult(new { message = "Image size cannot exceed 5 MB." });
            }

            return null;
        }
    }
}
