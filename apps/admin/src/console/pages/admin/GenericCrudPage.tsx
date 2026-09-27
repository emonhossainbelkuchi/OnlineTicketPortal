import { useEffect, useState, useCallback } from "react"
import { useParams } from "react-router-dom"
import toast from "react-hot-toast"
import { Plus, Image as ImageIcon } from "lucide-react"
import { api, ApiError } from "@/lib/api"
import { RESOURCES } from "@/config/resources.generated"
import DataTable from "@/components/ui/DataTable"
import FormModal from "@/components/ui/FormModal"
import ConfirmDialog from "@/components/ui/ConfirmDialog"
import WorkflowActionModal from "@/components/ui/WorkflowActionModal"

// আপনার কাস্টম পেজটি ইমপোর্ট করুন
import BusOperatorsPage from "./BusOperatorsPage" 

// Drives every one of the 76 API resources from one page.
export default function GenericCrudPage() {
  const { resourceKey } = useParams()
  const config = resourceKey ? RESOURCES[resourceKey] : undefined

  // ==========================================
  // BusOperators এর জন্য কাস্টম পেজ রিটার্ন করা
  // ==========================================
  if (resourceKey === "BusOperators") {
    return <BusOperatorsPage />
  }

  const [rows, setRows] = useState<any[] | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState<any | null>(null)
  const [workflowTarget, setWorkflowTarget] = useState<{ action: any; row: any | null } | null>(null)
  const [uploadTarget, setUploadTarget] = useState<any | null>(null)
  const [uploading, setUploading] = useState(false)

  const load = useCallback(async () => {
    if (!config) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(config.base)
      setRows(Array.isArray(res.data) ? res.data : res.data?.items ?? [])
    } catch (e) {
      setError((e as ApiError).message)
    } finally {
      setLoading(false)
    }
  }, [config])

  useEffect(() => { load() }, [load])

  if (!config) return <div className="card p-6">Unknown resource.</div>

  function openCreate() { setEditing(null); setFormOpen(true) }
  function openEdit(row: any) { setEditing(row); setFormOpen(true) }

  async function handleSubmit(values: Record<string, any>) {
    setSubmitting(true)
    try {
      if (editing) {
        await api.put(`${config!.base}/${editing.id}`, { ...values, rowVersion: editing.rowVersion })
        toast.success(`${config!.label} updated`)
      } else {
        await api.post(config!.base, values)
        toast.success(`${config!.label} created`)
      }
      setFormOpen(false)
      load()
    } catch (e) {
      toast.error((e as ApiError).message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deleting) return
    try {
      await api.delete(`${config!.base}/${deleting.id}`)
      toast.success(`${config!.label} deleted`)
      setDeleting(null)
      load()
    } catch (e) {
      toast.error((e as ApiError).message)
      setDeleting(null)
    }
  }

  async function handleWorkflowSubmit(values: Record<string, any>) {
    if (!workflowTarget) return
    const { action, row } = workflowTarget
    const path = action.path.replace("{id}", row?.id ?? "")
    const url = `${config!.base}/${path}`
    try {
      await api.post(url, action.fields.length ? values : undefined)
      toast.success(`${action.label} succeeded`)
      setWorkflowTarget(null)
      load()
    } catch (e) {
      toast.error((e as ApiError).message)
    }
  }

  async function handleUpload(file: File) {
    if (!uploadTarget) return
    setUploading(true)
    const form = new FormData()
    form.append("file", file)
    try {
      await api.post(`${config!.base}/${uploadTarget.id}/images`, form)
      toast.success("Image uploaded")
      setUploadTarget(null)
      load()
    } catch (e) {
      toast.error((e as ApiError).message)
    } finally {
      setUploading(false)
    }
  }

  const rowActions = config.workflowActions.filter(a => a.path.includes("{id}"))
  const toolbarActions = config.workflowActions.filter(a => !a.path.includes("{id}"))
  const canWrite = config.hasStdCrud

  return (
    <div>
      <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{config.label}</h1>
          <p className="text-sm text-gray-500 font-mono">{config.base}</p>
        </div>
        <div className="flex gap-2">
          {toolbarActions.map(a => (
            <button key={a.path} className="btn-secondary" onClick={() => setWorkflowTarget({ action: a, row: null })}>{a.label}</button>
          ))}
          {canWrite && (
            <button className="btn-primary" onClick={openCreate}><Plus className="h-4 w-4" /> New</button>
          )}
        </div>
      </div>
      <div className="card">
        <DataTable
          rows={rows}
          loading={loading}
          error={error}
          onRetry={load}
          onEdit={canWrite ? openEdit : undefined}
          onDelete={canWrite ? (row) => setDeleting(row) : undefined}
          extraActions={[
            ...(config.hasImageUpload ? [{ label: "Image", onClick: (row: any) => setUploadTarget(row) }] : []),
            ...rowActions.map(a => ({ label: a.label, onClick: (row: any) => setWorkflowTarget({ action: a, row }), danger: /reject|fail|cancel/i.test(a.label) })),
          ]}
        />
      </div>
      {canWrite && (
        <FormModal
          open={formOpen}
          title={editing ? `Edit ${config.label}` : `New ${config.label}`}
          fields={config.standardFields}
          initialValues={editing ?? undefined}
          submitting={submitting}
          onSubmit={handleSubmit}
          onClose={() => setFormOpen(false)}
        />
      )}
      <WorkflowActionModal
        open={!!workflowTarget}
        title={workflowTarget?.action.label ?? ""}
        fields={workflowTarget?.action.fields ?? []}
        onSubmit={handleWorkflowSubmit}
        onClose={() => setWorkflowTarget(null)}
      />
      {uploadTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-sm p-5">
            <div className="mb-3 flex items-center gap-2 font-semibold text-gray-900"><ImageIcon className="h-4 w-4" /> Upload image</div>
            <p className="mb-3 text-xs text-gray-500">POST {config.base}/{uploadTarget.id}/images (multipart/form-data)</p>
            <input
              type="file"
              accept="image/*"
              className="input"
              disabled={uploading}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f) }}
            />
            <div className="mt-4 flex justify-end">
              <button className="btn-secondary" onClick={() => setUploadTarget(null)} disabled={uploading}>Close</button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={!!deleting}
        title={`Delete this ${config.label}?`}
        description="This action cannot be undone."
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}