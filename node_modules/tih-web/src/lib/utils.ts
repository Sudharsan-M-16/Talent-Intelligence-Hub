import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { useState, useEffect, useRef, type RefObject } from 'react'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatRelativeTime(date: string | Date) {
  const now = new Date()
  const d = new Date(date)
  const diff = now.getTime() - d.getTime()
  const secs = Math.floor(diff / 1000)
  const mins = Math.floor(secs / 60)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)

  if (days > 7) return formatDate(date)
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (mins > 0) return `${mins}m ago`
  return 'just now'
}

export function formatCurrency(amount: number | undefined) {
  if (!amount) return '—'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    New: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    'Under Review': 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    Shortlisted: 'text-violet-400 bg-violet-400/10 border-violet-400/20',
    Approved: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    Engaged: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
    Rejected: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
  }
  return map[status] || 'text-slate-400 bg-slate-400/10 border-slate-400/20'
}

export function sourceIcon(source: string): string {
  const map: Record<string, string> = {
    WhatsApp: '💬',
    LinkedIn: '💼',
    Referral: '🤝',
    Email: '📧',
    Website: '🌐',
    'Job Portal': '📋',
    Manual: '✍️',
    Other: '📌',
  }
  return map[source] || '📌'
}

/**
 * Validates a URL to prevent javascript: / data: injection.
 * Returns the URL if it starts with https:// or http://, otherwise undefined.
 */
export function safeUrl(url: string | undefined): string | undefined {
  if (!url) return undefined
  const trimmed = url.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return undefined
}

/**
 * Prepends https:// to a bare URL if no protocol is present.
 * Returns undefined for empty / undefined input.
 */
export function normalizeUrl(url: string | undefined): string | undefined {
  if (!url?.trim()) return undefined
  if (/^https?:\/\//i.test(url.trim())) return url.trim()
  return `https://${url.trim()}`
}

export function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number) {
  let timer: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

/**
 * React hook that debounces a value by the given delay (ms).
 * Use to avoid triggering expensive re-computations on every keystroke.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

/**
 * Traps Tab-key focus within a container element while `active` is true.
 * Saves previously focused element and restores it on cleanup.
 */
export function useFocusTrap(active: boolean, containerRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!active || !containerRef.current) return
    const prevFocus = document.activeElement as HTMLElement
    const focusable = containerRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    first?.focus()
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus() }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus() }
      }
    }
    document.addEventListener('keydown', handleTab)
    return () => {
      document.removeEventListener('keydown', handleTab)
      prevFocus?.focus()
    }
  }, [active, containerRef])
}
