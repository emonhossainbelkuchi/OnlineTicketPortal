import { useEffect, useState } from "react"
import { X } from "lucide-react"
import type { ResourceField } from "@/config/resources.generated"
import { loadRelationOptions, relationTarget, type RelationOption } from "./relations"

// Generic form renderer -- fields come straight from the resource's config, which is
// itself generated from the real Create/Update DTOs. Never invents a field.
interface Props {
  open: boolean
  title: string
  fields: ResourceField[]
  initialValues?: Record<string, any>
  submitting?: boolean
  onSubmit: (values: Record<string, any>) => void
  onClose: () => void
}

function coerce(kind: string, raw: string, required: boolean) {
  if (kind === "number") return raw === "" ? (required ? 0 : null) : Number(raw)
  return raw
}

// The field config is PascalCase ("BusOperatorId") but API rows arrive camelCase ("busOperatorId"),
// so a plain initialValues[f.name] found nothing and every Edit form opened blank - saving it
// would then overwrite the record with empty values.
function initialFor(f: ResourceField, initial?: Record<string, any>) {
  if (!initial) return undefined
  const camel = f.name.charAt(0).toLowerCase() + f.name.slice(1)
  const value = initial[f.name] ?? initial[camel]
  // <input type="datetime-local"> only accepts "YYYY-MM-DDTHH:mm"; the API sends full ISO strings.
  if (f.kind === "datetime" && typeof value === "string") return value.slice(0, 16)
  return value
}

// An optional Guid?/DateTime?/number? left blank must go out as null: "" cannot be bound to those types.
function prepare(fields: ResourceField[], values: Record<string, any>) {
  const out: Record<string, any> = { ...values }
  for (const f of fields) {
    if (out[f.name] === "" && !f.required && f.type.endsWith("?")) out[f.name] = null
  }
  return out
}

export default function FormModal({ open, title, fields, initialValues, submitting, onSubmit, onClose }: Props) {
  const [values, setValues] = useState<Record<string, any>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [relations, setRelations] = useState<Record<string, RelationOption[]>>({})

  useEffect(() => {
    if (open) {
      const init: Record<string, any> = {}
      for (const f of fields) {
        // A new record should start active; every other checkbox starts unticked.
        init[f.name] = initialFor(f, initialValues) ?? (f.kind === "checkbox" ? (!initialValues && f.name === "IsActive") : "")
      }
      setValues(init)
      setErrors({})
    }
  }, [open, fields, initialValues])

  // Foreign-key fields become dropdowns of the real records they point at.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    const targets = new Map<string, string>()
    for (const f of fields) {
      const target = f.kind === "text" ? relationTarget(f) : null
      if (target) targets.set(f.name, target)
    }
    ;[...new Set(targets.values())].forEach(async (target) => {
      const options = await loadRelationOptions(target)
      if (cancelled) return
      setRelations((prev) => {
        const next = { ...prev }
        targets.forEach((t, fieldName) => { if (t === target) next[fieldName] = options })
        return next
      })
    })
    return () => { cancelled = true }
  }, [open, fields])

  if (!open) return null

  function setField(name: string, v: any) {
    setValues((s) => ({ ...s, [name]: v }))
  }

  function validate() {
    const errs: Record<string, string> = {}
    for (const f of fields) {
      if (f.required && (values[f.name] === "" || values[f.name] === null || values[f.name] === undefined)) {
        errs[f.name] = `${f.label} is required`
      }
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    onSubmit(prepare(fields, values))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="card max-h-[85vh] w-full max-w-lg overflow-y-auto p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="btn-ghost !px-1.5"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          {fields.length === 0 && <p className="text-sm text-gray-500">This resource has no editable fields.</p>}
          {fields.map((f) => (
            <div key={f.name}>
              <label className="label">{f.label}{f.kind === "datetime" && " (UTC)"}{f.required && <span className="text-red-500"> *</span>}</label>
              {f.kind === "checkbox" ? (
                <input type="checkbox" className="h-4 w-4 rounded border-gray-300" checked={!!values[f.name]} onChange={(e) => setField(f.name, e.target.checked)} />
              ) : f.kind === "select" && f.options ? (
                <select className="input" value={values[f.name] ?? ""} onChange={(e) => setField(f.name, e.target.value)}>
                  <option value="">Select...</option>
                  {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : relations[f.name] && relations[f.name].length > 0 ? (
                <select className="input" value={values[f.name] ?? ""} onChange={(e) => setField(f.name, e.target.value)}>
                  <option value="">{f.required ? "Select..." : "None"}</option>
                  {/* keep the current value selectable even if it is not in the loaded list */}
                  {values[f.name] && !relations[f.name].some((o) => o.id === values[f.name]) && (
                    <option value={values[f.name]}>{String(values[f.name])}</option>
                  )}
                  {relations[f.name].map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              ) : f.kind === "number" ? (
                <input type="number" step="any" className="input" value={values[f.name] ?? ""} onChange={(e) => setField(f.name, coerce("number", e.target.value, f.required))} />
              ) : f.kind === "datetime" ? (
                <input type="datetime-local" className="input" value={values[f.name] ?? ""} onChange={(e) => setField(f.name, e.target.value)} />
              ) : (
                <input type="text" className="input" value={values[f.name] ?? ""} onChange={(e) => setField(f.name, e.target.value)} />
              )}
              {errors[f.name] && <p className="mt-1 text-xs text-red-600">{errors[f.name]}</p>}
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? "Saving..." : "Save"}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
