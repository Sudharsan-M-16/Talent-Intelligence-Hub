import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Plus, Grid3X3, List, Star, Heart, GitCompare,
  ChevronDown, ChevronUp, X, SlidersHorizontal, Trash2,
  Eye, ChevronLeft, ChevronRight, Users, Download,
  KanbanSquare, Bookmark,
} from 'lucide-react'
import { exportProfiles } from '../lib/profileSpreadsheet'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import toast from 'react-hot-toast'
import { useTalentStore } from '../store/talentStore'
import type { TalentProfile, TalentStatus, TalentType } from '../types/database'
import { cn, formatCurrency, useDebounce } from '../lib/utils'
import StatusBadge from '../components/ui/StatusBadge'
import RatingStars from '../components/ui/RatingStars'
import TalentAvatar from '../components/ui/TalentAvatar'
import EmptyState from '../components/ui/EmptyState'
import ConfirmDialog from '../components/ui/ConfirmDialog'

const STATUSES: TalentStatus[] = ['New', 'Under Review', 'Shortlisted', 'Approved', 'Engaged', 'Rejected']
const TYPES: TalentType[] = ['Trainer', 'Consultant', 'Employee', 'Speaker', 'Mentor', 'Freelancer', 'Contractor', 'Other']

const STATUS_COLORS: Record<string, string> = {
  'New': '#5fa0f0',
  'Under Review': '#d4902c',
  'Shortlisted': '#9c7ce8',
  'Approved': '#3ab87a',
  'Engaged': '#22a4c0',
  'Rejected': '#d84850',
}

// Export column definitions
const EXPORT_COLUMNS = [
  { key: 'full_name', label: 'Full Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'talent_type', label: 'Type' },
  { key: 'status', label: 'Status' },
  { key: 'location', label: 'Location' },
  { key: 'organization', label: 'Organization' },
  { key: 'designation', label: 'Designation' },
  { key: 'years_experience', label: 'Experience' },
  { key: 'primary_skills', label: 'Primary Skills' },
  { key: 'secondary_skills', label: 'Secondary Skills' },
  { key: 'certifications', label: 'Certifications' },
  { key: 'overall_rating', label: 'Rating' },
  { key: 'source', label: 'Source' },
  { key: 'created_at', label: 'Created Date' },
]

function sanitizeCsvValue(value: unknown): string {
  let str = String(value ?? '')
  // CSV Injection Protection: prefix dangerous formula-trigger chars
  if (/^[=+\-@\t\r]/.test(str)) str = "'" + str
  // Quote cells containing special characters
  if (/[",\n\r\t]/.test(str)) str = `"${str.replace(/"/g, '""')}"`
  return str
}

function downloadCustomCSV(data: Record<string, unknown>[], filename: string) {
  const headers = Object.keys(data[0] || {})
  const rows = data.map((row) =>
    headers.map((h) => sanitizeCsvValue(row[h])).join(',')
  )
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function mapProfilesToColumns(
  profiles: TalentProfile[],
  selectedCols: string[]
): Record<string, unknown>[] {
  return profiles.map((p) => {
    const row: Record<string, unknown> = {}
    for (const col of selectedCols) {
      const val = (p as unknown as Record<string, unknown>)[col]
      if (Array.isArray(val)) {
        row[col] = val.join('; ')
      } else {
        row[col] = val
      }
    }
    return row
  })
}

export default function TalentListPage() {
  const navigate = useNavigate()
  const profiles = useTalentStore((s) => s.profiles)
  const filters = useTalentStore((s) => s.filters)
  const viewMode = useTalentStore((s) => s.viewMode)
  const savedSearches = useTalentStore((s) => s.savedSearches)
  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [showFilters, setShowFilters] = useState(true)
  const [skillInput, setSkillInput] = useState('')
  const [skillChips, setSkillChips] = useState<string[]>([])
  const skillInputRef = useRef<HTMLInputElement>(null)

  // Feature A: inline status dropdown
  const [openStatusId, setOpenStatusId] = useState<string | null>(null)

  // Feature B: bulk stage dropdown
  const [showBulkStageDropdown, setShowBulkStageDropdown] = useState(false)

  // Feature C: export modal
  const [showExportModal, setShowExportModal] = useState(false)
  const [selectedExportCols, setSelectedExportCols] = useState<string[]>(
    EXPORT_COLUMNS.map((c) => c.key)
  )

  // Feature D: keyboard navigation
  const [focusedRowIndex, setFocusedRowIndex] = useState(-1)

  // Feature E: saved searches
  const [showSaveInput, setShowSaveInput] = useState(false)

  // Grid view pagination
  const [gridLimit, setGridLimit] = useState(50)
  const [saveInputValue, setSaveInputValue] = useState('')

  // Confirm dialog for bulk delete
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([])

  // Debounced search
  const [searchInput, setSearchInput] = useState(filters.query || '')

  // Debounced search — 200ms delay prevents re-filtering on every keystroke
  const debouncedSearch = useDebounce(searchInput, 200)
  useEffect(() => {
    useTalentStore.getState().setFilters({ ...useTalentStore.getState().filters, query: debouncedSearch || undefined })
  }, [debouncedSearch])

  // Close export modal on Escape
  useEffect(() => {
    if (!showExportModal) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowExportModal(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [showExportModal])

  // Close status dropdown when clicking outside
  useEffect(() => {
    if (!openStatusId) return
    const handler = () => setOpenStatusId(null)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [openStatusId])

  // Close bulk stage dropdown when clicking outside
  useEffect(() => {
    if (!showBulkStageDropdown) return
    const handler = () => setShowBulkStageDropdown(false)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [showBulkStageDropdown])

  // Compute filtered profiles via useMemo to avoid re-render loops
  const filteredProfiles = useMemo(() => {
    let result = useTalentStore.getState().filteredProfiles()
    if (skillChips.length > 0) {
      const terms = skillChips.map((s) => s.toLowerCase())
      result = result.filter((p) => {
        const allSkills = [...p.primary_skills, ...p.secondary_skills].map((s) => s.toLowerCase())
        return terms.some((term) => allSkills.some((skill) => skill.includes(term)))
      })
    }
    return result
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profiles, filters, skillChips])

  // All unique skills across all profiles - for autocomplete suggestions
  const allSkillSuggestions = useMemo(() => {
    const set = new Set<string>()
    profiles.forEach((p) => {
      p.primary_skills.forEach((s) => set.add(s))
      p.secondary_skills.forEach((s) => set.add(s))
    })
    return [...set].sort()
  }, [profiles])

  const skillSuggestions = useMemo(() => {
    if (!skillInput.trim()) return []
    const lower = skillInput.toLowerCase()
    return allSkillSuggestions
      .filter((s) => s.toLowerCase().includes(lower) && !skillChips.includes(s))
      .slice(0, 8)
  }, [skillInput, allSkillSuggestions, skillChips])

  const addSkillChip = (skill: string) => {
    const trimmed = skill.trim()
    if (trimmed && !skillChips.includes(trimmed)) {
      setSkillChips((prev) => [...prev, trimmed])
    }
    setSkillInput('')
    skillInputRef.current?.focus()
  }

  const removeSkillChip = (skill: string) => {
    setSkillChips((prev) => prev.filter((s) => s !== skill))
  }

  const updateFilter = (key: string, value: unknown) => {
    useTalentStore.getState().setFilters({ ...filters, [key]: value || undefined })
  }

  const toggleStatus = (s: TalentStatus) => {
    const cur = filters.status || []
    updateFilter('status', cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s])
  }

  const toggleType = (t: TalentType) => {
    const cur = filters.talent_type || []
    updateFilter('talent_type', cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t])
  }

  const selectedIds = Object.keys(rowSelection).filter((k) => rowSelection[k])

  // Feature D: keyboard navigation
  const tableRows = useMemo(() => filteredProfiles, [filteredProfiles])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (viewMode !== 'table') return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusedRowIndex((prev) => Math.min(prev + 1, tableRows.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedRowIndex((prev) => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter') {
        if (focusedRowIndex >= 0 && focusedRowIndex < tableRows.length) {
          navigate(`/talent/${tableRows[focusedRowIndex].id}`)
        }
      } else if (e.key === 's' || e.key === 'S') {
        if (focusedRowIndex >= 0 && focusedRowIndex < tableRows.length) {
          const p = tableRows[focusedRowIndex]
          useTalentStore.getState().toggleShortlist(p.id)
          toast.success(p.is_shortlisted ? 'Removed from shortlist' : 'Added to shortlist')
        }
      } else if (e.key === 'f' || e.key === 'F') {
        if (focusedRowIndex >= 0 && focusedRowIndex < tableRows.length) {
          const p = tableRows[focusedRowIndex]
          useTalentStore.getState().toggleFavorite(p.id)
          toast.success(p.is_favorite ? 'Removed from favorites' : 'Added to favorites')
        }
      }
    },
    [focusedRowIndex, tableRows, navigate, viewMode]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Scroll focused row into view
  useEffect(() => {
    if (focusedRowIndex >= 0) {
      const rows = document.querySelectorAll<HTMLTableRowElement>('table.data-table tbody tr')
      if (rows[focusedRowIndex]) {
        rows[focusedRowIndex].scrollIntoView({ block: 'nearest' })
      }
    }
  }, [focusedRowIndex])

  const columns: ColumnDef<TalentProfile>[] = useMemo(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          onClick={(e) => e.stopPropagation()}
        />
      ),
      size: 40,
      enableSorting: false,
    },
    {
      accessorKey: 'full_name',
      header: 'Name',
      cell: ({ row }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <TalentAvatar name={row.original.full_name} size={30} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {row.original.full_name}
            </div>
            {row.original.designation && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {row.original.designation}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'talent_type',
      header: 'Type',
      cell: ({ getValue }) => (
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{getValue() as string}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      // Feature A: clickable status dropdown
      cell: ({ row }) => {
        const p = row.original
        const isOpen = openStatusId === p.id
        return (
          <div
            style={{ position: 'relative', display: 'inline-block' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              onClick={(e) => {
                e.stopPropagation()
                setOpenStatusId(isOpen ? null : p.id)
              }}
            >
              <StatusBadge status={p.status} size="sm" />
            </button>
            {isOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: 4,
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  zIndex: 30,
                  minWidth: 130,
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-lg)',
                }}
              >
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={(e) => {
                      e.stopPropagation()
                      useTalentStore.getState().updateStatus(p.id, s)
                      toast.success(`Status updated to ${s}`)
                      setOpenStatusId(null)
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '7px 12px',
                      fontSize: 12,
                      cursor: 'pointer',
                      background: 'none',
                      border: 'none',
                      color: STATUS_COLORS[s] ?? 'var(--text-secondary)',
                      fontFamily: 'inherit',
                      fontWeight: p.status === s ? 600 : 400,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-secondary)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'location',
      header: 'Location',
      cell: ({ getValue }) => (
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{(getValue() as string) || '-'}</span>
      ),
    },
    {
      accessorKey: 'primary_skills',
      header: 'Skills',
      enableSorting: false,
      cell: ({ getValue }) => {
        const skills = getValue() as string[]
        return (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {skills.slice(0, 2).map((s) => (
              <span key={s} className="skill-chip primary" style={{ fontSize: 10, padding: '2px 6px' }}>{s}</span>
            ))}
            {skills.length > 2 && (
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>+{skills.length - 2}</span>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'overall_rating',
      header: 'Rating',
      cell: ({ getValue }) => {
        const r = getValue() as number | undefined
        return r ? <RatingStars rating={r} size={11} showValue /> : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>-</span>
      },
    },
    {
      accessorKey: 'source',
      header: 'Source',
      cell: ({ getValue }) => (
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{getValue() as string}</span>
      ),
    },
    {
      accessorKey: 'years_experience',
      header: 'Exp.',
      cell: ({ getValue }) => {
        const yrs = getValue() as number | undefined
        return <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{yrs != null ? `${yrs}y` : '-'}</span>
      },
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: ({ row }) => {
        const p = row.original
        return (
          <div
            className="row-actions"
            style={{ display: 'flex', gap: 4, opacity: 0, transition: 'opacity 0.15s' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="btn-ghost"
              style={{ padding: '4px 6px', fontSize: 11 }}
              onClick={() => navigate(`/talent/${p.id}`)}
              title="View"
            >
              <Eye size={13} />
            </button>
            <button
              className="btn-ghost"
              style={{ padding: '4px 6px', color: p.is_shortlisted ? '#fbbf24' : undefined }}
              onClick={() => {
                useTalentStore.getState().toggleShortlist(p.id)
                toast.success(p.is_shortlisted ? 'Removed from shortlist' : 'Added to shortlist')
              }}
              title="Shortlist"
            >
              <Star size={13} fill={p.is_shortlisted ? '#fbbf24' : 'none'} />
            </button>
            <button
              className="btn-ghost"
              style={{ padding: '4px 6px', color: p.is_favorite ? '#ec4899' : undefined }}
              onClick={() => {
                useTalentStore.getState().toggleFavorite(p.id)
                toast.success(p.is_favorite ? 'Removed from favorites' : 'Added to favorites')
              }}
              title="Favorite"
            >
              <Heart size={13} fill={p.is_favorite ? '#ec4899' : 'none'} />
            </button>
            <button
              className="btn-ghost"
              style={{ padding: '4px 6px' }}
              onClick={() => {
                useTalentStore.getState().toggleCompare(p.id)
                toast.success('Added to compare')
              }}
              title="Compare"
            >
              <GitCompare size={13} />
            </button>
          </div>
        )
      },
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [navigate, openStatusId])

  const table = useReactTable({
    data: filteredProfiles,
    columns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 15 } },
    getRowId: (row) => row.id,
  })

  // Reset pagination to page 1 whenever the filtered result set changes
  useEffect(() => {
    table.setPageIndex(0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredProfiles.length, filters, skillChips])

  const activeFilterCount =
    (filters.status?.length || 0) +
    (filters.talent_type?.length || 0) +
    (filters.source?.length || 0) +
    (filters.query ? 1 : 0) +
    (filters.min_rating ? 1 : 0) +
    skillChips.length

  const showSavedSearchSection =
    savedSearches.length > 0 || activeFilterCount > 0 || skillChips.length > 0

  // Feature C: export with column selection
  const handleExportDownload = (format: 'csv' | 'xlsx') => {
    if (selectedExportCols.length === 0) {
      toast.error('Select at least one column to export')
      return
    }
    const mapped = mapProfilesToColumns(filteredProfiles, selectedExportCols)
    if (format === 'csv') {
      downloadCustomCSV(mapped, 'tih-talent-export.csv')
    } else {
      // For XLSX with column selection, use CSV approach since exportProfiles
      // expects TalentProfile[] not partial objects
      downloadCustomCSV(mapped, 'tih-talent-export.csv')
      toast('XLSX with column selection not supported - downloaded as CSV instead')
    }
    setShowExportModal(false)
  }

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Figtree', sans-serif", letterSpacing: '-0.01em' }}>
            Talent Directory
          </h1>
          <span
            style={{
              padding: '2px 9px',
              background: 'var(--accent-dim)',
              border: '1px solid var(--border-bright)',
              borderRadius: 99,
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--accent-bright)',
            }}
          >
            {filteredProfiles.length}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* View toggle */}
          <div
            style={{
              display: 'flex',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: 3,
              gap: 2,
            }}
          >
            {(['table', 'grid'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => useTalentStore.getState().setViewMode(mode)}
                style={{
                  padding: '5px 8px',
                  borderRadius: 6,
                  border: 'none',
                  background: viewMode === mode ? 'var(--bg-elevated)' : 'transparent',
                  color: viewMode === mode ? 'var(--text-primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'all 0.15s',
                }}
              >
                {mode === 'table' ? <List size={14} /> : <Grid3X3 size={14} />}
              </button>
            ))}
          </div>

          {/* Feature C: Single Export button */}
          <button
            className="btn-secondary"
            style={{ gap: 6, fontSize: 12 }}
            onClick={() => setShowExportModal(true)}
            title="Export profiles with column selection"
          >
            <Download size={13} /> Export
          </button>

          <button
            className="btn-secondary"
            onClick={() => setShowFilters((f) => !f)}
            style={{ gap: 6 }}
          >
            <SlidersHorizontal size={14} />
            Filters
            {activeFilterCount > 0 && (
              <span
                style={{
                  minWidth: 16,
                  height: 16,
                  borderRadius: 99,
                  background: 'var(--accent)',
                  color: 'white',
                  fontSize: 9,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4px',
                }}
              >
                {activeFilterCount}
              </span>
            )}
          </button>
          <button onClick={() => navigate('/talent/new')} className="btn-primary">
            <Plus size={14} /> Add Talent
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden', marginBottom: 16 }}
          >
            <div
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                {/* Search */}
                <div style={{ position: 'relative', minWidth: 240, flex: 1 }}>
                  <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <input
                    className="input-field"
                    style={{ paddingLeft: 30, height: 34 }}
                    placeholder="Search name, skill, email..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    aria-label="Search profiles"
                  />
                </div>

                {/* Experience */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Exp:</span>
                  <input
                    type="number"
                    className="input-field"
                    style={{ width: 56, height: 34, textAlign: 'center', padding: '0 8px' }}
                    placeholder="Min"
                    value={filters.min_experience ?? ''}
                    onChange={(e) => updateFilter('min_experience', e.target.value ? +e.target.value : undefined)}
                  />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>-</span>
                  <input
                    type="number"
                    className="input-field"
                    style={{ width: 56, height: 34, textAlign: 'center', padding: '0 8px' }}
                    placeholder="Max"
                    value={filters.max_experience ?? ''}
                    onChange={(e) => updateFilter('max_experience', e.target.value ? +e.target.value : undefined)}
                  />
                </div>

                {/* Rating */}
                <select
                  className="input-field"
                  style={{ height: 34, width: 120 }}
                  value={filters.min_rating ?? ''}
                  onChange={(e) => updateFilter('min_rating', e.target.value ? +e.target.value : undefined)}
                >
                  <option value="">Any rating</option>
                  <option value="3">★ 3+</option>
                  <option value="4">★ 4+</option>
                  <option value="4.5">★ 4.5+</option>
                </select>

                {activeFilterCount > 0 && (
                  <button
                    className="btn-ghost"
                    style={{ height: 34, gap: 5, color: 'var(--danger)' }}
                    onClick={() => { useTalentStore.getState().clearFilters(); setSkillChips([]) }}
                  >
                    <X size={12} /> Clear all
                  </button>
                )}
              </div>

              {/* Skill filter */}
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
                  Filter by Skill
                  {skillChips.length > 0 && (
                    <span style={{ marginLeft: 6, color: 'var(--accent-bright)' }}>- {filteredProfiles.length} match</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  {/* Skill chips */}
                  {skillChips.map((chip) => (
                    <span
                      key={chip}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '3px 8px', borderRadius: 99, fontSize: 11, fontWeight: 500,
                        background: 'var(--accent-dim)', border: '1px solid var(--border-bright)',
                        color: 'var(--accent-bright)',
                      }}
                    >
                      {chip}
                      <button
                        onClick={() => removeSkillChip(chip)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-bright)', padding: 0, lineHeight: 1, display: 'flex' }}
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                  {/* Skill input with autocomplete */}
                  <div style={{ position: 'relative' }}>
                    <input
                      ref={skillInputRef}
                      className="input-field"
                      style={{ height: 30, fontSize: 12, minWidth: 180, paddingRight: 8 }}
                      placeholder="Type a skill (e.g. Python)â€¦"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && skillInput.trim()) { addSkillChip(skillInput); e.preventDefault() }
                        if (e.key === 'Backspace' && !skillInput && skillChips.length) removeSkillChip(skillChips[skillChips.length - 1])
                      }}
                    />
                    {skillSuggestions.length > 0 && (
                      <div
                        style={{
                          position: 'absolute', top: '100%', left: 0, zIndex: 20, marginTop: 3,
                          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                          borderRadius: 8, overflow: 'hidden', minWidth: 200, boxShadow: 'var(--shadow-lg)',
                        }}
                      >
                        {skillSuggestions.map((s) => (
                          <button
                            key={s}
                            onMouseDown={(e) => { e.preventDefault(); addSkillChip(s) }}
                            style={{
                              display: 'block', width: '100%', textAlign: 'left',
                              padding: '7px 12px', fontSize: 12, cursor: 'pointer',
                              background: 'none', border: 'none', color: 'var(--text-secondary)',
                              fontFamily: 'inherit',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-secondary)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {skillChips.length > 0 && (
                    <button className="btn-ghost" style={{ fontSize: 11, height: 28, color: 'var(--text-muted)' }} onClick={() => setSkillChips([])}>
                      <X size={11} /> Clear skills
                    </button>
                  )}
                </div>
              </div>

              {/* Status pills */}
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Status</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {STATUSES.map((s) => {
                    const active = filters.status?.includes(s)
                    return (
                      <button
                        key={s}
                        onClick={() => toggleStatus(s)}
                        style={{
                          padding: '4px 11px',
                          borderRadius: 99,
                          fontSize: 11,
                          fontWeight: 500,
                          border: '1px solid',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          fontFamily: 'inherit',
                          background: active ? 'var(--accent-dim)' : 'transparent',
                          borderColor: active ? 'var(--border-bright)' : 'var(--border)',
                          color: active ? 'var(--accent-bright)' : 'var(--text-secondary)',
                        }}
                      >
                        {s}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Type pills */}
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Type</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {TYPES.map((t) => {
                    const active = filters.talent_type?.includes(t)
                    return (
                      <button
                        key={t}
                        onClick={() => toggleType(t)}
                        style={{
                          padding: '4px 11px',
                          borderRadius: 99,
                          fontSize: 11,
                          fontWeight: 500,
                          border: '1px solid',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          fontFamily: 'inherit',
                          background: active ? 'var(--accent-dim)' : 'transparent',
                          borderColor: active ? 'var(--border-bright)' : 'var(--border)',
                          color: active ? 'var(--accent-bright)' : 'var(--text-secondary)',
                        }}
                      >
                        {t}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Feature E: Saved Searches */}
              {showSavedSearchSection && (
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
                    Saved Searches
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* Save current button */}
                    {(activeFilterCount > 0 || skillChips.length > 0) && (
                      <>
                        {showSaveInput ? (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault()
                              const name = saveInputValue.trim()
                              if (!name) return
                              useTalentStore.getState().saveSearch(name, { ...filters, skills: skillChips })
                              toast.success('Search saved')
                              setSaveInputValue('')
                              setShowSaveInput(false)
                            }}
                            style={{ display: 'flex', gap: 4, alignItems: 'center' }}
                          >
                            <input
                              className="input-field"
                              style={{ height: 28, fontSize: 12, minWidth: 140 }}
                              placeholder="Search nameâ€¦"
                              value={saveInputValue}
                              onChange={(e) => setSaveInputValue(e.target.value)}
                              autoFocus
                            />
                            <button type="submit" className="btn-primary" style={{ height: 28, padding: '0 10px', fontSize: 11 }}>
                              Save
                            </button>
                            <button
                              type="button"
                              className="btn-ghost"
                              style={{ height: 28, padding: '0 8px' }}
                              onClick={() => { setShowSaveInput(false); setSaveInputValue('') }}
                            >
                              <X size={11} />
                            </button>
                          </form>
                        ) : (
                          <button
                            className="btn-ghost"
                            style={{ height: 28, fontSize: 11, gap: 4, color: 'var(--accent-bright)', border: '1px dashed var(--border-bright)', borderRadius: 6, padding: '0 10px' }}
                            onClick={() => setShowSaveInput(true)}
                          >
                            <Bookmark size={11} /> Save current
                          </button>
                        )}
                      </>
                    )}

                    {/* Saved search chips */}
                    {savedSearches.map((ss) => (
                      <span
                        key={ss.id}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 500,
                          background: 'rgba(94,106,210,0.12)', border: '1px solid rgba(94,106,210,0.25)',
                          color: 'var(--accent-bright)', cursor: 'pointer',
                        }}
                      >
                        <Bookmark size={10} />
                        <span
                          onClick={() => {
                            const f = ss.filters_json
                            useTalentStore.getState().setFilters(f)
                            if (f.skills) {
                              setSkillChips(f.skills)
                            }
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          {ss.name}
                        </span>
                        <button
                          onClick={() => useTalentStore.getState().deleteSavedSearch(ss.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-bright)', padding: 0, lineHeight: 1, display: 'flex', marginLeft: 2 }}
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk action bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              background: 'var(--accent-dim)',
              border: '1px solid var(--border-bright)',
              borderRadius: 9,
              marginBottom: 12,
            }}
          >
            <span style={{ fontSize: 13, color: 'var(--accent-bright)', fontWeight: 500 }}>
              {selectedIds.length} selected
            </span>
            <div style={{ flex: 1 }} />
            <button
              className="btn-secondary"
              style={{ height: 30, fontSize: 12 }}
              onClick={() => {
                selectedIds.forEach((id) => useTalentStore.getState().toggleShortlist(id))
                toast.success(`Shortlisted ${selectedIds.length} profiles`)
                setRowSelection({})
              }}
            >
              <Star size={12} /> Shortlist All
            </button>
            <button
              className="btn-danger"
              style={{ height: 30, fontSize: 12 }}
              onClick={() => {
                setPendingDeleteIds([...selectedIds])
                setShowBulkDeleteConfirm(true)
              }}
            >
              <Trash2 size={12} /> Delete
            </button>
            <button className="btn-ghost" style={{ height: 30 }} onClick={() => setRowSelection({})}>
              <X size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table view */}
      {viewMode === 'table' && (
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          {filteredProfiles.length === 0 ? (
            <EmptyState
              icon={Users as Parameters<typeof EmptyState>[0]['icon']}
              title="No talent found"
              description="Try adjusting your filters or add new talent to the directory."
              action={<button onClick={() => navigate('/talent/new')} className="btn-primary"><Plus size={13} />Add Talent</button>}
            />
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%' }}>
                  <thead>
                    {table.getHeaderGroups().map((hg) => (
                      <tr key={hg.id}>
                        {hg.headers.map((header) => (
                          <th
                            key={header.id}
                            onClick={header.column.getToggleSortingHandler()}
                            style={{ cursor: header.column.getCanSort() ? 'pointer' : 'default' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {header.column.getIsSorted() === 'asc' && <ChevronUp size={11} />}
                              {header.column.getIsSorted() === 'desc' && <ChevronDown size={11} />}
                            </div>
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {table.getRowModel().rows.map((row, rowIdx) => (
                      <tr
                        key={row.id}
                        style={{
                          cursor: 'pointer',
                          outline: focusedRowIndex === rowIdx ? '2px solid var(--accent)' : undefined,
                          outlineOffset: focusedRowIndex === rowIdx ? '-2px' : undefined,
                        }}
                        onClick={() => navigate(`/talent/${row.original.id}`)}
                        onMouseEnter={(e) => {
                          e.currentTarget.querySelectorAll<HTMLElement>('.row-actions').forEach((el) => {
                            el.style.opacity = '1'
                          })
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.querySelectorAll<HTMLElement>('.row-actions').forEach((el) => {
                            el.style.opacity = '0'
                          })
                        }}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 16px',
                  borderTop: '1px solid var(--border)',
                }}
              >
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}-
                  {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, filteredProfiles.length)} of {filteredProfiles.length}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className="btn-ghost"
                    style={{ padding: '4px 8px' }}
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  {Array.from({ length: table.getPageCount() }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => table.setPageIndex(i)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        border: '1px solid',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontFamily: 'inherit',
                        background: table.getState().pagination.pageIndex === i ? 'var(--accent)' : 'transparent',
                        borderColor: table.getState().pagination.pageIndex === i ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
                        color: table.getState().pagination.pageIndex === i ? 'white' : 'var(--text-muted)',
                      }}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    className="btn-ghost"
                    style={{ padding: '4px 8px' }}
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                    aria-label="Next page"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Grid view */}
      {viewMode === 'grid' && (
        filteredProfiles.length === 0 ? (
          <EmptyState
            icon={Users as Parameters<typeof EmptyState>[0]['icon']}
            title="No talent found"
            description="Try adjusting your filters or add new talent."
          />
        ) : (
          <div className="talent-grid">
            {filteredProfiles.slice(0, gridLimit).map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="glass-hover"
                style={{ borderRadius: 12, padding: 16, cursor: 'pointer', position: 'relative' }}
                onClick={() => navigate(`/talent/${p.id}`)}
              >
                <div style={{ position: 'absolute', top: 12, right: 12 }} onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={!!rowSelection[p.id]}
                    onChange={() => setRowSelection(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <TalentAvatar name={p.full_name} size={40} />
                  <StatusBadge status={p.status} size="sm" />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{p.full_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{p.designation || p.talent_type}</div>
                  {p.organization && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{p.organization}</div>}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
                  {p.primary_skills.slice(0, 3).map((s) => (
                    <span key={s} className="skill-chip primary" style={{ fontSize: 10, padding: '2px 7px' }}>{s}</span>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {p.overall_rating ? (
                    <RatingStars rating={p.overall_rating} size={12} showValue />
                  ) : (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Not rated</span>
                  )}
                  <div style={{ display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
                    <button
                      className="btn-ghost"
                      style={{ padding: '3px 5px', color: p.is_favorite ? '#ec4899' : undefined }}
                      onClick={() => {
                        useTalentStore.getState().toggleFavorite(p.id)
                        toast.success(p.is_favorite ? 'Removed from favorites' : 'Added to favorites')
                      }}
                    >
                      <Heart size={13} fill={p.is_favorite ? '#ec4899' : 'none'} />
                    </button>
                    <button
                      className="btn-ghost"
                      style={{ padding: '3px 5px', color: p.is_shortlisted ? '#fbbf24' : undefined }}
                      onClick={() => {
                        useTalentStore.getState().toggleShortlist(p.id)
                        toast.success(p.is_shortlisted ? 'Removed from shortlist' : 'Shortlisted')
                      }}
                    >
                      <Star size={13} fill={p.is_shortlisted ? '#fbbf24' : 'none'} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
            {filteredProfiles.length > gridLimit && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', paddingTop: 12 }}>
                <button
                  className="btn-secondary"
                  onClick={() => setGridLimit((l) => l + 50)}
                  style={{ fontSize: 13 }}
                >
                  Show more ({filteredProfiles.length - gridLimit} remaining)
                </button>
              </div>
            )}
          </div>
        )
      )}

      {/* Floating Bulk Action Bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              bottom: 32,
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-bright)',
              borderRadius: 99,
              padding: '8px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              boxShadow: 'var(--shadow-lg)',
              zIndex: 50,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              {selectedIds.length} selected
            </div>
            <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: 12 }}
                onClick={() => {
                  const store = useTalentStore.getState()
                  const currentCompare = store.compareIds
                  let added = 0
                  selectedIds.forEach((id) => {
                    if (!currentCompare.includes(id) && store.compareIds.length < 5) {
                      store.toggleCompare(id)
                      added++
                    }
                  })
                  if (added > 0) toast.success(`Added ${added} profiles to compare`)
                  if (store.compareIds.length >= 5 && selectedIds.length > added) {
                    toast.error('Maximum 5 profiles can be compared')
                  }
                  navigate('/compare')
                }}
              >
                <GitCompare size={14} /> Compare
              </button>
              <button
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: 12 }}
                onClick={() => {
                  selectedIds.forEach(id => {
                    const profile = profiles.find(p => p.id === id)
                    if (profile && !profile.is_shortlisted) {
                      useTalentStore.getState().toggleShortlist(id)
                    }
                  })
                  toast.success(`Shortlisted ${selectedIds.length} profiles`)
                  setRowSelection({})
                }}
              >
                <Star size={14} /> Shortlist
              </button>

              {/* Feature B: Move to Stage */}
              <div style={{ position: 'relative' }}>
                <button
                  className="btn-secondary"
                  style={{ padding: '6px 12px', fontSize: 12 }}
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowBulkStageDropdown((v) => !v)
                  }}
                >
                  <KanbanSquare size={14} /> Stage
                </button>
                {showBulkStageDropdown && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '100%',
                      left: 0,
                      marginBottom: 6,
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      zIndex: 60,
                      minWidth: 140,
                      overflow: 'hidden',
                      boxShadow: 'var(--shadow-lg)',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {STATUSES.map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          useTalentStore.getState().bulkUpdateStatus(selectedIds, s)
                          toast.success(`Moved ${selectedIds.length} profiles to ${s}`)
                          setRowSelection({})
                          setShowBulkStageDropdown(false)
                        }}
                        style={{
                          display: 'block',
                          width: '100%',
                          textAlign: 'left',
                          padding: '7px 12px',
                          fontSize: 12,
                          cursor: 'pointer',
                          background: 'none',
                          border: 'none',
                          color: STATUS_COLORS[s] ?? 'var(--text-secondary)',
                          fontFamily: 'inherit',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-secondary)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                className="btn-danger"
                style={{ padding: '6px 12px', fontSize: 12 }}
                onClick={() => {
                  setPendingDeleteIds([...selectedIds])
                  setShowBulkDeleteConfirm(true)
                }}
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
            <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
            <button
              style={{
                background: 'none', border: 'none', color: 'var(--text-muted)',
                cursor: 'pointer', padding: 4, display: 'flex',
              }}
              onClick={() => setRowSelection({})}
              title="Clear selection"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ARIA live region: announces filter results to screen readers */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{ position: 'absolute', left: -9999, width: 1, height: 1, overflow: 'hidden' }}
      >
        {filteredProfiles.length} profiles found
      </div>

      {/* Keyboard shortcut hint — shown when a row has focus */}
      {focusedRowIndex >= 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '6px 0',
            fontSize: 11,
            color: 'var(--text-muted)',
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: '0.02em',
          }}
        >
          ↑↓ navigate · Enter open · S shortlist · F favorite · Esc exit
        </div>
      )}

      {/* Bulk delete confirm dialog */}
      <ConfirmDialog
        open={showBulkDeleteConfirm}
        title="Delete Profiles"
        message={`Are you sure you want to delete ${pendingDeleteIds.length} profile${pendingDeleteIds.length !== 1 ? 's' : ''}? You can undo this immediately.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => {
          const deleted = profiles.filter((p) => pendingDeleteIds.includes(p.id))
          pendingDeleteIds.forEach((id) => useTalentStore.getState().deleteProfile(id))
          setShowBulkDeleteConfirm(false)
          setRowSelection({})
          toast(
            (t) => (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {`Deleted ${deleted.length} profile${deleted.length !== 1 ? 's' : ''}.`}
                <button
                  onClick={() => {
                    deleted.forEach((p) => useTalentStore.getState().addProfile(p))
                    toast.dismiss(t.id)
                  }}
                  style={{
                    color: 'var(--accent)',
                    fontWeight: 600,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    fontFamily: 'inherit',
                    fontSize: 13,
                  }}
                >
                  Undo
                </button>
              </span>
            ),
            { duration: 5000 }
          )
          setPendingDeleteIds([])
        }}
        onCancel={() => {
          setShowBulkDeleteConfirm(false)
          setPendingDeleteIds([])
        }}
      />

      {/* Feature C: Export modal */}
      <AnimatePresence>
        {showExportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
            }}
            onClick={() => setShowExportModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.18 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="export-modal-title"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 14,
                padding: 24,
                maxWidth: 480,
                width: '100%',
                maxHeight: '80vh',
                overflow: 'auto',
              }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2 id="export-modal-title" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Figtree', sans-serif", margin: 0 }}>
                  Export Profiles
                </h2>
                <button
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 4 }}
                  onClick={() => setShowExportModal(false)}
                  aria-label="Close export dialog"
                >
                  <X size={16} />
                </button>
              </div>

              <div style={{ marginBottom: 10, display: 'flex', gap: 10, fontSize: 12 }}>
                <button
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-bright)', padding: 0, fontFamily: 'inherit', fontSize: 12 }}
                  onClick={() => setSelectedExportCols(EXPORT_COLUMNS.map((c) => c.key))}
                >
                  Select All
                </button>
                <span style={{ color: 'var(--text-muted)' }}>/</span>
                <button
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-bright)', padding: 0, fontFamily: 'inherit', fontSize: 12 }}
                  onClick={() => setSelectedExportCols([])}
                >
                  Deselect All
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
                {EXPORT_COLUMNS.map((col) => (
                  <label
                    key={col.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      cursor: 'pointer',
                      fontSize: 13,
                      color: 'var(--text-secondary)',
                      padding: '4px 6px',
                      borderRadius: 6,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-secondary)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedExportCols.includes(col.key)}
                      onChange={() => {
                        setSelectedExportCols((prev) =>
                          prev.includes(col.key)
                            ? prev.filter((k) => k !== col.key)
                            : [...prev, col.key]
                        )
                      }}
                    />
                    {col.label}
                  </label>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn-ghost" onClick={() => setShowExportModal(false)}>
                  Cancel
                </button>
                <button
                  className="btn-secondary"
                  style={{ gap: 6, fontSize: 12 }}
                  onClick={() => handleExportDownload('xlsx')}
                  disabled={selectedExportCols.length === 0}
                >
                  <Download size={13} /> Download Excel
                </button>
                <button
                  className="btn-primary"
                  style={{ gap: 6, fontSize: 12 }}
                  onClick={() => handleExportDownload('csv')}
                  disabled={selectedExportCols.length === 0}
                >
                  <Download size={13} /> Download CSV
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

