import { useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, FileSpreadsheet, Filter, Search, Upload, X, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTalentStore } from '../store/talentStore'
import type { TalentProfile, TalentSource, TalentStatus, TalentType } from '../types/database'
import {
  exportProfiles,
  filterProfilesForBulkPage,
  parseProfilesWorkbook,
  removeDuplicateProfiles,
  downloadTemplate,
  type ParseResult
} from '../lib/profileSpreadsheet'

const STATUSES: TalentStatus[] = ['New', 'Under Review', 'Shortlisted', 'Approved', 'Engaged', 'Rejected']
const TYPES: TalentType[] = ['Trainer', 'Consultant', 'Employee', 'Speaker', 'Mentor', 'Freelancer', 'Contractor', 'Other']
const SOURCES: TalentSource[] = ['WhatsApp', 'LinkedIn', 'Referral', 'Email', 'Website', 'Job Portal', 'Manual', 'Other']

const initialFilters = {
  query: '',
  skill: '',
  location: '',
  minExperience: '',
  maxExperience: '',
  status: '',
  source: '',
  talentType: '',
}

function formatSkills(profile: TalentProfile) {
  const skills = [...profile.primary_skills, ...profile.secondary_skills]
  return skills.length ? skills.join(', ') : '-'
}

export default function BulkProfilesPage() {
  const inputRef = useRef<HTMLInputElement>(null)
  const profiles = useTalentStore((s) => s.profiles)
  const [pendingProfiles, setPendingProfiles] = useState<TalentProfile[]>([])
  const [duplicateProfiles, setDuplicateProfiles] = useState<TalentProfile[]>([])
  
  // Parse Report State
  const [parseReport, setParseReport] = useState<ParseResult | null>(null)
  const [showFailedRows, setShowFailedRows] = useState(false)
  
  const [isReading, setIsReading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [filters, setFilters] = useState(initialFilters)
  const [sessionImportIds, setSessionImportIds] = useState<Set<string>>(new Set())
  const [showOnlyImports, setShowOnlyImports] = useState(false)
  const [stagedSelected, setStagedSelected] = useState<Set<string>>(new Set())

  const filteredProfiles = useMemo(() => {
    let result = filterProfilesForBulkPage(profiles, filters)
    if (showOnlyImports && sessionImportIds.size > 0) {
      result = result.filter((p) => sessionImportIds.has(p.id))
    }
    return result
  }, [profiles, filters, showOnlyImports, sessionImportIds])

  const updateFilter = (key: keyof typeof filters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  const handleFile = async (file: File) => {
    setIsReading(true)
    setParseReport(null)
    setPendingProfiles([])
    setDuplicateProfiles([])
    setShowFailedRows(false)
    
    try {
      const result = await parseProfilesWorkbook(file)
      setParseReport(result)
      
      const { unique, duplicates } = removeDuplicateProfiles(result.profiles, profiles)
      setPendingProfiles(unique)
      setDuplicateProfiles(duplicates)
      const allIds = new Set([...unique.map(p => p.id), ...duplicates.map(p => p.id)])
      setStagedSelected(allIds)
      
      if (result.failedRows.length > 0) {
        toast.error(`${result.failedRows.length} rows failed parsing`)
      }
      if (unique.length > 0) {
        toast.success(`Ready to import ${unique.length} unique profiles`)
      }
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not read spreadsheet')
    } finally {
      setIsReading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const removePendingProfile = (id: string) => {
    setPendingProfiles((prev) => prev.filter((p) => p.id !== id))
    setDuplicateProfiles((prev) => prev.filter((p) => p.id !== id))
    setStagedSelected((prev) => { const next = new Set(prev); next.delete(id); return next })
  }

  const importSelectedProfiles = () => {
    const toImport = stagedProfiles.filter(p => stagedSelected.has(p.id))
    if (!toImport.length) { toast.error('Select at least one profile to import'); return }
    useTalentStore.getState().addProfiles(toImport)
    const newIds = toImport.map(p => p.id)
    setSessionImportIds(new Set(newIds))
    setShowOnlyImports(true)
    toast.success(`Imported ${toImport.length} profiles`)
    setPendingProfiles([])
    setDuplicateProfiles([])
    setStagedSelected(new Set())
    setParseReport(null)
  }

  const importPendingProfiles = (includeDuplicates: boolean) => {
    const toImport = includeDuplicates ? [...pendingProfiles, ...duplicateProfiles] : pendingProfiles
    if (!toImport.length) return
    useTalentStore.getState().addProfiles(toImport)
    
    const newIds = toImport.map((p) => p.id)
    setSessionImportIds(new Set(newIds))
    setShowOnlyImports(true)

    toast.success(`Imported ${toImport.length} profiles to the TIH`)
    setPendingProfiles([])
    setDuplicateProfiles([])
    setParseReport(null)
  }

  const activeFilterCount = Object.values(filters).filter(Boolean).length
  const isStaging = pendingProfiles.length > 0 || duplicateProfiles.length > 0
  const stagedProfiles = [...pendingProfiles, ...duplicateProfiles]

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Bulk Profiles</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            Upload CSV or Excel sheets. Our engine intelligently maps columns, extracts missing fields, and cleans data.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn-secondary" onClick={() => void exportProfiles(profiles, 'csv', 'tih-all-profiles')}>
            <Download size={14} /> All CSV
          </button>
          <button className="btn-secondary" onClick={() => void exportProfiles(profiles, 'xlsx', 'tih-all-profiles')}>
            <Download size={14} /> All Excel
          </button>
        </div>
      </div>

      <div className="bulk-profiles-layout">
        <section className="section-card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <FileSpreadsheet size={18} color="var(--accent-bright)" />
              <div>
                <h2 style={{ fontSize: 15 }}>Smart Bulk Upload</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Drop any list of candidates. We'll figure out the rest.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-ghost" onClick={() => void downloadTemplate('csv')} style={{ fontSize: 12 }}>
                <Download size={12} /> CSV Template
              </button>
              <button className="btn-ghost" onClick={() => void downloadTemplate('xlsx')} style={{ fontSize: 12 }}>
                <Download size={12} /> XLSX Template
              </button>
            </div>
          </div>

          <div
            className={`upload-zone${isDragging ? ' dragging' : ''}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(event) => {
              event.preventDefault()
              setIsDragging(false)
              const file = event.dataTransfer.files[0]
              if (file) handleFile(file)
            }}
            style={{ padding: 26 }}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx"
              style={{ display: 'none' }}
              onChange={(event) => event.target.files?.[0] && handleFile(event.target.files[0])}
            />
            <Upload size={24} color="var(--accent-bright)" />
            <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 10 }}>
              {isReading ? 'Reading and analyzing spreadsheet...' : 'Drop or browse CSV / Excel'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              Supports headers, no-headers, jumbled columns, and missing data fallback inference.
            </div>
          </div>

          <AnimatePresence>
            {parseReport && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  
                  {/* Parse Results Summary */}
                  <div className="alert" style={{ background: 'var(--surface-high)', borderColor: 'var(--border)', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: 13, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CheckCircle2 size={14} color="var(--accent-bright)" />
                        Parse Report
                      </h4>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        <strong>{parseReport.profiles.length}</strong> valid rows extracted.
                        {duplicateProfiles.length > 0 && <span style={{ color: '#d97706' }}> {duplicateProfiles.length} duplicate(s) detected.</span>}
                        {parseReport.failedRows.length > 0 && <span style={{ color: '#ef4444' }}> {parseReport.failedRows.length} rows failed.</span>}
                      </p>

                      {parseReport.fileWarnings && parseReport.fileWarnings.length > 0 && (
                        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {parseReport.fileWarnings.map((w, i) => (
                            <div key={i} style={{ fontSize: 11, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(245,158,11,0.08)', borderRadius: 4, padding: '3px 6px' }}>
                              <AlertTriangle size={12} /> <strong>File:</strong>&nbsp;{w}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {Object.keys(parseReport.columnMap).length > 0 && (
                        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.7 }}>
                          <strong>Column map:</strong> {Object.entries(parseReport.columnMap).map(([k, v]) => `"${k}" → ${v}`).join(' · ')}
                        </div>
                      )}
                      
                      {parseReport.warnings.length > 0 && (
                        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 120, overflowY: 'auto' }}>
                          {parseReport.warnings.map((w, i) => (
                            <div key={i} style={{ fontSize: 11, color: '#d97706', display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                              <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 1 }} /> {w}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Failed Rows Detail */}
                  {parseReport.failedRows.length > 0 && (
                    <div style={{ border: '1px solid #ef444433', borderRadius: 8, overflow: 'hidden' }}>
                      <button 
                        onClick={() => setShowFailedRows(!showFailedRows)}
                        style={{ width: '100%', padding: '8px 12px', background: '#ef444411', border: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', color: '#ef4444', fontSize: 12 }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={14} /> View {parseReport.failedRows.length} Failed Rows</span>
                        <span>{showFailedRows ? 'Hide' : 'Show'}</span>
                      </button>
                      <AnimatePresence>
                        {showFailedRows && (
                          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} style={{ overflow: 'hidden' }}>
                            <div style={{ maxHeight: 200, overflowY: 'auto', padding: 12, background: 'var(--surface-high)', fontSize: 11, display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {parseReport.failedRows.map((fail, idx) => (
                                <div key={idx} style={{ paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                                  <div style={{ color: '#ef4444', fontWeight: 500, marginBottom: 4 }}>Row {fail.rowNumber}: {fail.reason}</div>
                                  <pre style={{ margin: 0, color: 'var(--text-muted)', whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 10 }}>
                                    {JSON.stringify(fail.data)}
                                  </pre>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {(pendingProfiles.length > 0 || duplicateProfiles.length > 0) && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                      <button className="btn-primary" onClick={importSelectedProfiles}>
                        Import Selected ({stagedSelected.size})
                      </button>
                      <button className="btn-secondary" onClick={() => importPendingProfiles(false)}>
                        Import All Unique ({pendingProfiles.length})
                      </button>
                      {duplicateProfiles.length > 0 && (
                        <button className="btn-ghost" onClick={() => importPendingProfiles(true)}>
                          Import All + Duplicates ({pendingProfiles.length + duplicateProfiles.length})
                        </button>
                      )}
                      <button className="btn-ghost" onClick={() => { setPendingProfiles([]); setDuplicateProfiles([]); setStagedSelected(new Set()); setParseReport(null) }}>
                        <X size={13} /> Cancel
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </section>

        <section className="section-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Filter size={16} color="var(--accent-bright)" />
                <h2 style={{ fontSize: 15 }}>Filter Profiles</h2>
                <span className="badge" style={{ background: 'var(--accent-dim)', color: 'var(--accent-bright)' }}>
                  {filteredProfiles.length} matches
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn-secondary" onClick={() => void exportProfiles(filteredProfiles, 'csv', 'tih-filtered-profiles')}>
                  <Download size={14} /> Filtered CSV
                </button>
                <button className="btn-secondary" onClick={() => void exportProfiles(filteredProfiles, 'xlsx', 'tih-filtered-profiles')}>
                  <Download size={14} /> Filtered Excel
                </button>
                {sessionImportIds.size > 0 && (
                  <button 
                    className={showOnlyImports ? "btn-primary" : "btn-secondary"} 
                    onClick={() => setShowOnlyImports(!showOnlyImports)}
                  >
                    {showOnlyImports ? "Viewing Just Added" : "Show Just Added"} ({sessionImportIds.size})
                  </button>
                )}
                {activeFilterCount > 0 && (
                  <button className="btn-ghost" onClick={() => setFilters(initialFilters)}>
                    <X size={13} /> Clear Filters
                  </button>
                )}
              </div>
            </div>

            <div className="bulk-filter-grid">
              <div className="bulk-filter-search">
                <Search size={13} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--text-muted)' }} />
                <input
                  className="input-field"
                  style={{ paddingLeft: 30 }}
                  placeholder="Search name, email, org, skills..."
                  value={filters.query}
                  onChange={(event) => updateFilter('query', event.target.value)}
                />
              </div>
              <input
                className="input-field"
                placeholder="Skill: Python, etc."
                value={filters.skill}
                onChange={(event) => updateFilter('skill', event.target.value)}
              />
              <input
                className="input-field"
                placeholder="Location"
                value={filters.location}
                onChange={(event) => updateFilter('location', event.target.value)}
              />
              <input
                className="input-field"
                type="number"
                min={0}
                placeholder="Min exp"
                value={filters.minExperience}
                onChange={(event) => updateFilter('minExperience', event.target.value)}
              />
              <input
                className="input-field"
                type="number"
                min={0}
                placeholder="Max exp"
                value={filters.maxExperience}
                onChange={(event) => updateFilter('maxExperience', event.target.value)}
              />
              <select className="input-field" value={filters.talentType} onChange={(event) => updateFilter('talentType', event.target.value)}>
                <option value="">Any type</option>
                {TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
              <select className="input-field" value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}>
                <option value="">Any status</option>
                {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
              <select className="input-field" value={filters.source} onChange={(event) => updateFilter('source', event.target.value)}>
                <option value="">Any source</option>
                {SOURCES.map((source) => <option key={source} value={source}>{source}</option>)}
              </select>
            </div>
          </div>

          {isStaging ? (
            <div style={{ overflowX: 'auto' }}>
              <div style={{ padding: '12px 16px', background: 'var(--accent-dim)', color: 'var(--accent-bright)', fontSize: 13, fontWeight: 500, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Info size={16} />
                STAGING AREA — Review the {stagedProfiles.length} valid rows below. You can delete any before importing.
              </div>
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>
                      <input
                        type="checkbox"
                        checked={stagedSelected.size === stagedProfiles.length && stagedProfiles.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) setStagedSelected(new Set(stagedProfiles.map(p => p.id)))
                          else setStagedSelected(new Set())
                        }}
                        style={{ cursor: 'pointer' }}
                      />
                    </th>
                    <th>Name / Details</th>
                    <th>Extracted Skills</th>
                    <th>Experience</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Contact</th>
                    <th style={{ width: 60, textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {stagedProfiles.map((profile) => {
                    const isDup = duplicateProfiles.some(d => d.id === profile.id);
                    return (
                      <tr key={profile.id} style={{ background: isDup ? 'rgba(217, 119, 6, 0.05)' : undefined }}>
                        <td>
                          <input
                            type="checkbox"
                            checked={stagedSelected.has(profile.id)}
                            onChange={(e) => {
                              setStagedSelected(prev => {
                                const next = new Set(prev)
                                if (e.target.checked) next.add(profile.id); else next.delete(profile.id)
                                return next
                              })
                            }}
                            style={{ cursor: 'pointer' }}
                          />
                        </td>
                        <td>
                          <div style={{ color: 'var(--text-primary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                            {profile.full_name}
                            {isDup && <span style={{ fontSize: 10, color: '#d97706', padding: '2px 6px', background: 'rgba(217,119,6,0.1)', borderRadius: 4 }}>Duplicate</span>}
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{profile.designation || profile.organization || profile.talent_type}</div>
                        </td>
                        <td style={{ maxWidth: 320, color: 'var(--text-secondary)' }}>{formatSkills(profile)}</td>
                        <td>{profile.years_experience != null ? `${profile.years_experience} yrs` : '-'}</td>
                        <td>{profile.location || '-'}</td>
                        <td><span className="badge" style={{ background: 'var(--surface-high)' }}>{profile.status}</span></td>
                        <td>
                          <div style={{ fontSize: 12 }}>{profile.email || '-'}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{profile.phone || '-'}</div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button 
                            className="btn-ghost" 
                            style={{ color: '#ef4444', padding: '6px' }} 
                            onClick={() => removePendingProfile(profile.id)}
                            title="Delete Row"
                          >
                            <X size={14} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {stagedProfiles.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                        No valid profiles found in staging.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Name / Details</th>
                    <th>Skills</th>
                    <th>Experience</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Contact</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProfiles.slice(0, 100).map((profile) => (
                    <tr key={profile.id}>
                      <td>
                        <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{profile.full_name}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{profile.designation || profile.organization || profile.talent_type}</div>
                      </td>
                      <td style={{ maxWidth: 320, color: 'var(--text-secondary)' }}>{formatSkills(profile)}</td>
                      <td>{profile.years_experience != null ? `${profile.years_experience} yrs` : '-'}</td>
                      <td>{profile.location || '-'}</td>
                      <td><span className="badge" style={{ background: 'var(--surface-high)' }}>{profile.status}</span></td>
                      <td>
                        <div style={{ fontSize: 12 }}>{profile.email || '-'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{profile.phone || '-'}</div>
                      </td>
                    </tr>
                  ))}
                  {filteredProfiles.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                        No profiles match the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {!isStaging && filteredProfiles.length > 100 && (
            <div style={{ padding: 12, borderTop: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 12 }}>
              Showing first 100 results. Export includes all {filteredProfiles.length} matching profiles.
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
