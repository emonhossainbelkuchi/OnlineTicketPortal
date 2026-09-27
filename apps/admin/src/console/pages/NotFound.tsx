export default function NotFound() {
  return (
    <div className='flex min-h-[60vh] flex-col items-center justify-center text-center'>
      <h1 className='text-4xl font-bold text-gray-900'>404</h1>
      <p className='mt-2 text-gray-500'>Page not found.</p>
      <a href='/admin' className='btn-primary mt-4'>Back to dashboard</a>
    </div>
  )
}
