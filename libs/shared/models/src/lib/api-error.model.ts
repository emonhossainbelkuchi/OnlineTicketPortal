// The backend does NOT return one consistent error shape (verified against
// Program.cs's UseExceptionHandler + ASP.NET's built-in [ApiController]
// validation responses). You'll see all of these depending on what failed:
//
//  1. Unhandled exception (Program.cs global handler): { message: "..." }
//  2. Model validation (automatic 400 from [ApiController]):
//     { title, status, errors: { FieldName: ["msg1", "msg2"] } }
//  3. A plain string body, e.g. Unauthorized("Invalid username or password")
//     or NotFound() with no body at all.
//  4. An array of strings, e.g. AccountController.Register's
//     BadRequest(result.Errors.Select(e => e.Description)).
//
// This normalized shape is what ErrorInterceptor converts ALL of the above
// into before anything else in the app ever sees an HTTP error. Always
// catch/display THIS shape — never reach into a raw HttpErrorResponse body
// in a feature component.
export interface ApiError {
  status: number;
  message: string;
  fieldErrors?: Record<string, string[]>;
}
