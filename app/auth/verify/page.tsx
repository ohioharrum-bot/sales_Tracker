export default function VerifyPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 w-full max-w-md text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <div className="w-8 h-6 border-2 border-slate-300 rounded-sm relative after:content-[''] after:absolute after:top-0 after:left-0 after:w-full after:h-[1px] after:bg-slate-300 after:rotate-[20deg] before:content-[''] before:absolute before:top-0 before:left-0 before:w-full before:h-[1px] before:bg-slate-300 before:rotate-[-20deg]" />
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Check your email</h1>
        <p className="text-sm text-gray-500">
          We sent a confirmation link to your email address. Click it to activate your account.
        </p>
        <a
          href="/auth/login"
          className="inline-block mt-6 text-sm text-blue-600 hover:underline"
        >
          Back to login
        </a>
      </div>
    </div>
  )
}