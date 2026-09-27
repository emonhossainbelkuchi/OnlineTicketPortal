import { api } from "@/lib/api"
import { RESOURCES } from "@/config/resources.generated"
import type { ResourceField } from "@/config/resources.generated"

/**
 * The generated form config knows every foreign key only as a Guid text box ("BusOperatorId"),
 * which means pasting GUIDs by hand. This maps such a field to the resource it points at so the
 * form can offer a dropdown of real records instead. Anything it cannot map stays a text box.
 */
const EXPLICIT: Record<string, string> = {
  ReverseRouteId: "BusRoutes",
  ParentBusRouteId: "BusRoutes",
  BoardingTerminalId: "Terminals",
  DroppingTerminalId: "Terminals",
}

const singular = (key: string) => (key.endsWith("ies") ? key.slice(0, -3) + "y" : key.replace(/s$/, ""))

/** "OriginTerminalId" -> "Terminals" (longest resource name the field name ends with), or null. */
export function relationTarget(field: ResourceField): string | null {
  if (!/Guid/i.test(field.type) || !field.name.endsWith("Id") || field.name === "Id") return null
  if (EXPLICIT[field.name]) return EXPLICIT[field.name]
  const base = field.name.slice(0, -2)
  let best: string | null = null
  for (const key of Object.keys(RESOURCES)) {
    const one = singular(key)
    if (base.endsWith(one) && (!best || one.length > singular(best).length)) best = key
  }
  return best
}

export interface RelationOption {
  id: string
  label: string
}

const LABEL_FIELDS = [
  "name", "title", "fullName", "integrationName", "routeCode", "tripCode", "code",
  "pnr", "ticketNumber", "coachNumber", "registrationNumber", "subject", "email", "userName",
]

function labelFor(row: Record<string, any>): string {
  for (const f of LABEL_FIELDS) {
    if (typeof row[f] === "string" && row[f].trim()) return `${row[f]}`
  }
  return String(row.id)
}

/** Loads the records a foreign-key dropdown offers. Failures return [] (the field stays usable as free text). */
export async function loadRelationOptions(resourceKey: string): Promise<RelationOption[]> {
  try {
    const res = await api.get(RESOURCES[resourceKey].base)
    const rows: any[] = Array.isArray(res.data) ? res.data : res.data?.items ?? []
    return rows
      .filter((r) => r && r.id)
      .map((r) => ({ id: String(r.id), label: labelFor(r) }))
      .sort((a, b) => a.label.localeCompare(b.label))
  } catch {
    return []
  }
}
