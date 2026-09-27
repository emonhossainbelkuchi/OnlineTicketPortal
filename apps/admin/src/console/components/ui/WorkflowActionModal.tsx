import { useEffect, useState } from "react"
import { X } from "lucide-react"
import type { ResourceField } from "@/config/resources.generated"

// For non-CRUD workflow endpoints (approve/reject/generate/redeem/initiate/...). If the
// backend action takes no body (e.g. Refunds {id}/process), this just confirms and posts.
interface Props {
  open: boolean
  title: string
  fields: ResourceField[]
  onSubmit: (values: Record<string, any>) => void
  onClose: () => void
}

export default function WorkflowActionModal({ open, title, fields, onSubmit, onClose }: Props) {
  const [values, setValues] = useState<Record<string, any>>({})

  useEffect(() => {
    if (open) {
      const init: Record<string, any> = {}
      for (const f of fields) init[f.name] = f.kind === "checkbox" ? false : ""
      setValues(init)
    }
  }, [open, fields])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="card w-full max-w-md p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="btn-ghost !px-1.5"><X className="h-4 w-4" /></button>
        </div>
        {fields.length === 0 ? (
          <p className="text-sm text-gray-600">This will call the backend action immediately. Continue?</p>
        ) : (
          <div className="space-y-3">
            {fields.map((f) => (
              <div key={f.name}>
                <label className="label">{f.label}</label>
                {f.kind === "select" && f.options ? (
                  <select className="input" value={values[f.name] ?? ""} onChange={(e) => setValues(s => ({...s, [f.name]: e.target.value}))}>
                    <option value="">Select...</option>
                    {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : f.kind === "checkbox" ? (
                  <input type="checkbox" checked={!!values[f.name]} onChange={(e) => setValues(s => ({...s, [f.name]: e.target.checked}))} />
                ) : f.kind === "datetime" ? (
                  <input type="datetime-local" className="input" value={values[f.name] ?? ""} onChange={(e) => setValues(s => ({...s, [f.name]: e.target.value}))} />
                ) : (
                  <input type={f.kind === "number" ? "number" : "text"} className="input" value={values[f.name] ?? ""} onChange={(e) => setValues(s => ({...s, [f.name]: e.target.value}))} />
                )}
              </div>
            ))}
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={() => onSubmit(values)}>Confirm</button>
        </div>
      </div>
    </div>
  )
}
