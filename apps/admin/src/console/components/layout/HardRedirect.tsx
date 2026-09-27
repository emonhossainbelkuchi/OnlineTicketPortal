import { useEffect } from "react"

/**
 * Leaves the management console with a full page load (not a client-side navigation). The
 * console and the rest of the admin app ship different global CSS (Bootstrap + Tailwind vs
 * the shared design tokens), so crossing between them must reload the document, otherwise
 * one side's stylesheet would leak into the other.
 */
export function HardRedirect({ to }: { to: string }) {
  useEffect(() => {
    window.location.replace(to)
  }, [to])
  return null
}
