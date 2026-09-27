import { AlertTriangle } from "lucide-react"
export default function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <AlertTriangle className="h-10 w-10 text-red-400" />
      <div className="font-medium text-gray-700">{message}</div>
      {onRetry && (
        <button className="btn-secondary" onClick={onRetry}>Try again</button>
      )}
    </div>
  )
}
