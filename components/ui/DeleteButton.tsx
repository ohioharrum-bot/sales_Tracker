'use client'

import { useState } from 'react'

interface DeleteButtonProps {
  onConfirm: () => Promise<void>
  label?: string
}

export function DeleteButton({ onConfirm, label = 'Delete' }: DeleteButtonProps) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    setLoading(true)
    await onConfirm()
    setLoading(false)
    setConfirming(false)
  }

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1">
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="text-xs text-white bg-red-600 hover:bg-red-700 px-2 py-1 rounded transition-colors disabled:opacity-50"
        >
          {loading ? '...' : 'Confirm'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded transition-colors"
        >
          Cancel
        </button>
      </span>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-xs text-red-500 hover:text-red-700 transition-colors"
    >
      {label}
    </button>
  )
}
