import { readSheet } from 'read-excel-file/browser'
import writeXlsxFile from 'write-excel-file/browser'
import type { SheetData } from 'write-excel-file/browser'
import type { TalentProfile, TalentSource, TalentStatus, TalentType } from '../types/database'
import { DEMO_ORG_ID } from './demoData'

type Row = Record<string, unknown>

export interface RowFailure { rowNumber: number; data: unknown; reason: string }
export interface ParseResult {
  profiles: TalentProfile[]
  failedRows: RowFailure[]
  warnings: string[]
  columnMap: Record<string, string>
  fileWarnings: string[]
}

const TALENT_TYPES: TalentType[] = ['Trainer','Consultant','Employee','Speaker','Mentor','Freelancer','Contractor','Other']
const STATUSES: TalentStatus[]   = ['New','Under Review','Shortlisted','Approved','Engaged','Rejected']
const SOURCES: TalentSource[]    = ['WhatsApp','LinkedIn','Referral','Email','Website','Job Portal','Manual','Other']

export const PROFILE_EXPORT_COLUMNS = [
  'Full Name','Email','Phone','Alternate Phone','Talent Type','Source','Status',
  'Organization','Designation','Years Experience','Location','Availability',
  'Expected Compensation','Primary Skills','Secondary Skills','Certifications',
  'Domains','LinkedIn URL','Portfolio URL','Website','Overall Rating',
  'Shortlisted','Favorite','Notes','Created At','Updated At',
] as const
type ExportColumn = (typeof PROFILE_EXPORT_COLUMNS)[number]

// Known enum values — prevent them from being inferred as names or skills
const ENUM_VALUES_SET = new Set([
  ...TALENT_TYPES.map(s => s.toLowerCase()),
  ...STATUSES.map(s => s.toLowerCase()),
  ...SOURCES.map(s => s.toLowerCase()),
])

// ─── alias map ────────────────────────────────────────────────────────────────
const COLUMN_ALIASES: Record<string, keyof TalentProfile> = {
  // name variants
  name:'full_name', fullname:'full_name', full_name:'full_name', candidate:'full_name',
  candidatename:'full_name', profilename:'full_name', firstname:'full_name',
  candidatefullname:'full_name', person:'full_name', resource:'full_name',
  // email
  email:'email', emailaddress:'email', mail:'email', emailid:'email', officialemail:'email',
  // phone
  phone:'phone', mobile:'phone', mobilenumber:'phone', contact:'phone',
  contactnumber:'phone', telephone:'phone', phonenumber:'phone', contactno:'phone',
  mobileno:'phone', ph:'phone', phn:'phone',
  // alternate phone
  alternatephone:'alternate_phone', alternate_phone:'alternate_phone', altphone:'alternate_phone',
  phone2:'alternate_phone', mobile2:'alternate_phone', alternateno:'alternate_phone',
  // type
  type:'talent_type', talenttype:'talent_type', talent_type:'talent_type', category:'talent_type',
  profile:'talent_type', profiletype:'talent_type', resourcetype:'talent_type',
  // source
  source:'source', origin:'source', referredby:'source', channel:'source',
  // status
  status:'status', state:'status', stage:'status', hirestage:'status', currentstatus:'status',
  // organization
  company:'organization', employer:'organization', organization:'organization',
  organisation:'organization', currentcompany:'organization', currentorganization:'organization',
  currentemployer:'organization', firm:'organization', workplace:'organization',
  // designation
  designation:'designation', title:'designation', role:'designation', jobtitle:'designation',
  position:'designation', currentrole:'designation', currentdesignation:'designation',
  jobprofile:'designation', currenttitle:'designation',
  // experience
  experience:'years_experience', yearsexperience:'years_experience', years_experience:'years_experience',
  exp:'years_experience', yoe:'years_experience', totalexperience:'years_experience',
  experienceyears:'years_experience', totalexp:'years_experience', workyears:'years_experience',
  // location
  location:'location', city:'location', place:'location', currentlocation:'location',
  presentlocation:'location', worklocation:'location', basedout:'location',
  // availability
  availability:'availability', noticeperiod:'availability', notice:'availability',
  noticeindays:'availability', joiningtime:'availability', joiningavailability:'availability',
  // compensation
  compensation:'expected_compensation', expectedcompensation:'expected_compensation',
  expected_compensation:'expected_compensation', ctc:'expected_compensation',
  salary:'expected_compensation', expectedsalary:'expected_compensation',
  expectedctc:'expected_compensation', currentctc:'expected_compensation',
  lakhsperannum:'expected_compensation', annualsalary:'expected_compensation',
  // skills
  primaryskills:'primary_skills', primary_skills:'primary_skills', skills:'primary_skills',
  skill:'primary_skills', technicalskills:'primary_skills', techstack:'primary_skills',
  skillslist:'primary_skills', keyskills:'primary_skills', mainskills:'primary_skills',
  coretechnologies:'primary_skills', primarytechnology:'primary_skills',
  secondaryskills:'secondary_skills', secondary_skills:'secondary_skills',
  otherskills:'secondary_skills', additionalskills:'secondary_skills',
  // certs/domains
  certifications:'certifications', certificates:'certifications', certs:'certifications',
  domains:'domains', domain:'domains', industrydomains:'domains', industry:'domains',
  // links
  linkedin:'linkedin_url', linkedinurl:'linkedin_url', linkedin_url:'linkedin_url',
  linkedinprofile:'linkedin_url', lnkdn:'linkedin_url',
  portfolio:'portfolio_url', portfoliourl:'portfolio_url', portfolio_url:'portfolio_url',
  github:'portfolio_url', githuburl:'portfolio_url', githubprofile:'portfolio_url',
  website:'website', web:'website', url:'website', personalwebsite:'website',
  // rating
  rating:'overall_rating', overallrating:'overall_rating', overall_rating:'overall_rating',
  score:'overall_rating', candidaterate:'overall_rating', rank:'overall_rating',
  // notes
  notes:'notes', remarks:'notes', comments:'notes', description:'notes',
  feedback:'notes', recruiterremarks:'notes', recruitercomments:'notes',
}

/** Normalize header to a plain alpha-numeric key */
export function nh(h: string): string { return h.toLowerCase().replace(/[^a-z0-9_]+/g,'').trim() }

/** Find alias: exact match first, then longest-prefix/contains match. Returns [field, score] */
export function findAlias(header: string): [keyof TalentProfile | undefined, number] {
  const normalized = nh(header)
  if (COLUMN_ALIASES[normalized]) return [COLUMN_ALIASES[normalized], 100]
  const sorted = Object.keys(COLUMN_ALIASES).sort((a, b) => b.length - a.length)
  for (const alias of sorted) {
    if (alias.length >= 4 && normalized.includes(alias)) return [COLUMN_ALIASES[alias], alias.length]
  }
  return [undefined, 0]
}

function isQualitySkills(skills: string[]): boolean {
  if (!skills.length) return false
  if (skills.length === 1) {
    const s = skills[0]
    // Reject pure common English or enum words
    if (ENUM_VALUES_SET.has(s.toLowerCase())) return false
    const hasIndicators = /[.#+]|\d/.test(s) || s.includes('-') || s.includes('/')
    if (!hasIndicators && s.split(' ').length <= 2 && s.length < 20) return false
  }
  // Reject if all items are short common words (likely a location split by commas)
  const techLike = skills.filter(s => /[\d.#+\-/]/.test(s) || s.length > 10 || /[A-Z]/.test(s[0]||'')).length
  if (skills.length >= 2 && techLike === 0) return false
  return true
}

export function txt(v: unknown): string|undefined {
  if (v===null||v===undefined) return undefined
  const s=String(v).trim(); return s||undefined
}

export function num(v: unknown): number|undefined {
  if (v===null||v===undefined||v==='') return undefined
  const m=String(v).replace(/,/g,'').match(/-?\d+(?:\.\d+)?/)
  if (!m) return undefined
  const n=Number(m[0]); return isFinite(n)?n:undefined
}

export const SKILL_ALIASES: Record<string,string>={
  reactjs:'React','react.js':'React',nodejs:'Node.js','node.js':'Node.js',
  nextjs:'Next.js','next.js':'Next.js',vuejs:'Vue.js','vue.js':'Vue.js',
  angularjs:'Angular','angular.js':'Angular',
  js:'JavaScript',javascript:'JavaScript',ts:'TypeScript',typescript:'TypeScript',
  py:'Python',python:'Python',rb:'Ruby',golang:'Go',
  'ai/ml':'AI/ML','ml/ai':'AI/ML','ai & ml':'AI/ML',
  'c#':'C#',csharp:'C#','c++':'C++',cpp:'C++',
  psql:'PostgreSQL',postgres:'PostgreSQL',mysql:'MySQL',
  mongodb:'MongoDB',mongo:'MongoDB',
  aws:'AWS',gcp:'GCP',azure:'Azure',k8s:'Kubernetes',
}

export function normSkill(s: string): string {
  const k = s.toLowerCase().trim()
  return SKILL_ALIASES[k] || s.trim()
}

export function listVal(v: unknown): string[] {
  const s=txt(v); if(!s) return []
  // Split on primary delimiters first, then handle / and & within each fragment
  const raw=s.split(/[,;|\n]+/).flatMap(t=>{
    const trimmed=t.trim(); if(!trimmed) return []
    // If the whole fragment is a known compound alias (e.g. 'ai/ml'), keep it whole
    const aliasKey=trimmed.toLowerCase()
    if(SKILL_ALIASES[aliasKey]) return [SKILL_ALIASES[aliasKey]]
    // Otherwise split on / and space-&-space
    return trimmed.split('/').flatMap(x=>x.split(/\s+&\s+/)).map(x=>x.trim()).filter(Boolean)
  })
  const expanded=raw.flatMap(t=>{ const n=normSkill(t); return n.includes(',')? n.split(',').map(x=>x.trim()).filter(Boolean):[n] })
  const seen=new Set<string>()
  return expanded.filter(x=>{ const k=x.toLowerCase(); if(seen.has(k)) return false; seen.add(k); return true })
}

export function fuzzyEnum<T extends string>(v: unknown, allowed: readonly T[], fallback?: T): T|undefined {
  const s=txt(v); if(!s) return fallback
  // Strip ALL non-alphanumeric chars (including spaces and hyphens) for normalization
  const n=s.toLowerCase().replace(/[^a-z0-9]/g,'')

  // Exact match (normalized, no spaces/hyphens)
  for(const item of allowed){
    const a=item.toLowerCase().replace(/[^a-z0-9]/g,'')
    if(n===a) return item
  }

  if(n.length < 3) return fallback // too short for safe partial match

  // Partial match: input contains the enum value (e.g. "superapproved" contains "approved")
  for(const item of allowed){
    const a=item.toLowerCase().replace(/[^a-z0-9]/g,'')
    if(a.length >= 4 && n.includes(a)) return item
  }

  // Reverse partial: enum value contains the input (e.g. "jobportal" inside "jobportal")
  if(n.length >= 4){
    for(const item of allowed){
      const a=item.toLowerCase().replace(/[^a-z0-9]/g,'')
      if(a.includes(n)) return item
    }
  }

  return fallback
}

// ─── Pattern detectors ────────────────────────────────────────────────────────
export const RX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
export const RX_PHONE = /^(?:\+?[\d\s().\-]{7,20})$/
export const RX_URL   = /^https?:\/\/.+/i
export const RX_URL_BARE = /^(?:www\.|linkedin\.com|github\.com|gitlab\.com|behance\.net|dribbble\.com).+/i
export const RX_NAME  = /^[A-Za-zÀ-ÿ]+([ '\-][A-Za-zÀ-ÿ]+){1,5}$/

export function looksLikePhone(s: string): boolean {
  const stripped=s.replace(/[\s().+\-]/g,'')
  return /^\d{7,15}$/.test(stripped) && RX_PHONE.test(s)
}

export function looksLikeExp(s: string): boolean {
  const n=num(s)
  if(n===undefined) return false
  if(!isFinite(n) || n<0 || n>80) return false
  // Reject 4-digit year-like values (1900-2099) — these are dates not experience
  if(Number.isInteger(n) && n>=1900 && n<=2099) return false
  // Reject values with non-numeric characters (except decimal point)
  if(/[a-zA-Z@,]/.test(s)) return false
  return true
}

function looksLikeCompensation(s: string): boolean {
  const n = num(s)
  if (n === undefined) return false
  // Large numbers (>100) are almost certainly compensation, not experience
  return n > 100
}

function resolveUrl(v: string): { field: 'linkedin_url'|'portfolio_url'|'website', url: string } {
  const url = RX_URL.test(v) ? v : `https://${v}`
  if (/linkedin\.com/i.test(v)) return { field: 'linkedin_url', url }
  if (/github\.com|gitlab\.com/i.test(v)) return { field: 'portfolio_url', url }
  return { field: 'website', url }
}

// ─── CSV parser ───────────────────────────────────────────────────────────────
export function detectDelimiter(firstLine: string): string {
  const counts: Record<string,number> = { ',':0, ';':0, '\t':0, '|':0 }
  let inQ=false
  for(const c of firstLine){
    if(c==='"'){ inQ=!inQ; continue }
    if(!inQ && counts[c]!==undefined) counts[c]++
  }
  const best = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]
  return best[1] > 0 ? best[0] : ','
}

export function parseCsv(content: string): string[][] {
  // Strip BOMs: UTF-8 (﻿) and UTF-16 BE (￾)
  const clean = content.replace(/^﻿|￾/,'')
  const lines = clean.split(/\r?\n|\r/)
  const nonEmpty = lines.filter(l=>l.trim())
  if(nonEmpty.length===0) return []
  const delim = detectDelimiter(nonEmpty[0])

  const matrix: string[][] = []
  let row: string[] = []
  let cell=''
  let inQ=false
  const text=clean.replace(/\r\n/g,'\n').replace(/\r/g,'\n')

  for(let i=0;i<text.length;i++){
    const c=text[i], nx=text[i+1]
    if(inQ){
      if(c==='"'&&nx==='"'){ cell+='"'; i++ }
      else if(c==='"'){ inQ=false }
      else cell+=c
    } else {
      if(c==='"'){ inQ=true }
      else if(c===delim){ row.push(cell.trim()); cell='' }
      else if(c==='\n'){
        row.push(cell.trim()); matrix.push(row); row=[]; cell=''
      }
      else cell+=c
    }
  }
  // Flush last cell/row
  if(cell||row.length){ row.push(cell.trim()); matrix.push(row) }
  return matrix.filter(r=>r.some(c=>c.trim()))
}

function matrixToRows(matrix: unknown[][]): {rows:Row[], hasHeaders:boolean, originalHeaders:string[]} {
  if(!matrix.length) return {rows:[],hasHeaders:false,originalHeaders:[]}
  const headers=matrix[0].map(c=>txt(c)||'')
  // Require ≥2 recognizable headers OR ≥1 for small files (≤3 columns)
  const matchCount=headers.filter(h=>findAlias(h)[0]).length
  const hasHeaders = matchCount >= 2 || (matchCount >= 1 && headers.length <= 3)
  const dataStart=hasHeaders?1:0
  const hdrs=hasHeaders?headers:headers.map((_,i)=>`Col_${i}`)
  const rows=matrix.slice(dataStart).map(r=>
    hdrs.reduce<Row>((a,h,i)=>{ if(h) a[h]=r[i]; return a },{})
  )
  return {rows,hasHeaders,originalHeaders:hdrs}
}

async function readRows(file: File): Promise<{rows:Row[],matrix:unknown[][],hasHeaders:boolean}> {
  const ext=file.name.split('.').pop()?.toLowerCase()
  if(ext==='xls') throw new Error('Legacy .xls format is not supported. Please open in Excel and save as .xlsx, then re-upload.')
  if(ext==='csv'||file.type==='text/csv'||file.type==='text/plain'){
    const content=await file.text()
    const matrix=parseCsv(content)
    const {rows,hasHeaders}=matrixToRows(matrix)
    return {rows,matrix,hasHeaders}
  }
  if(ext==='xlsx'){
    // Try first sheet
    let matrix = await readSheet(file) as unknown[][]
    let {rows, hasHeaders} = matrixToRows(matrix)

    // If no recognizable headers in sheet 1, try additional sheets (up to 5)
    if(!hasHeaders && rows.length === 0) {
      for(let sheetIndex=2; sheetIndex<=5; sheetIndex++){
        try {
          const altMatrix = await readSheet(file, sheetIndex) as unknown[][]
          if(!altMatrix.length) continue
          const alt = matrixToRows(altMatrix)
          if(alt.hasHeaders || alt.rows.length > rows.length){
            matrix = altMatrix
            rows = alt.rows
            hasHeaders = alt.hasHeaders
            break
          }
        } catch { break } // no more sheets
      }
    }

    return {rows, matrix, hasHeaders}
  }
  throw new Error('Unsupported format. Please upload a CSV or XLSX file.')
}

// ─── Main parser ──────────────────────────────────────────────────────────────
export async function parseProfilesWorkbook(file: File): Promise<ParseResult> {
  const {rows,matrix,hasHeaders}=await readRows(file)
  const now=new Date().toISOString()

  const profiles: TalentProfile[]=[]
  const failedRows: RowFailure[]=[]
  const warnings: string[]=[]
  const fileWarnings: string[]=[]
  const columnMap: Record<string,string>={}
  const seenKeys=new Set<string>()

  if(!rows.length && !matrix.length) throw new Error('The file is empty.')
  if(rows.length === 0 && matrix.length > 0) {
    fileWarnings.push('File contains only headers with no data rows.')
    return {profiles, failedRows, warnings, columnMap, fileWarnings}
  }
  if(!hasHeaders) {
    fileWarnings.push('No recognizable column headers found — inferring all fields from cell content patterns.')
  } else {
    matrix[0]?.forEach(h=>{
      const s=txt(h)||''
      const [m] = findAlias(s)
      if(m) columnMap[s]=String(m)
    })
  }

  rows.forEach((row,idx)=>{
    const rowNum=idx+(hasHeaders?2:1)

    const cells=Object.entries(row)
      .map(([header,value]) => {
        const [mapped, score] = findAlias(header)
        return { header, value:txt(value), mapped, score, used:false }
      })
      .filter(c=>!!c.value)

    if(!cells.length) return // completely blank row

    const ex: Record<string,unknown>={}
    const rowWarns: string[]=[]
    const unassigned: string[]=[]

    // Fields that should never be pattern-detected — Pass 2 handles them by header
    const NUMERIC_FIELDS = new Set<string>(['expected_compensation','years_experience','overall_rating'])

    // ── PASS 1: Pattern-based extraction (overrides headers for certainty) ────
    cells.forEach(cell=>{
      // If the column is explicitly mapped to a numeric field, skip pattern detection
      if(cell.mapped && NUMERIC_FIELDS.has(String(cell.mapped))) return
      const v=cell.value!

      // Email — highest certainty
      if(RX_EMAIL.test(v)){
        if(!ex.email){ ex.email=v; cell.used=true
          if(cell.mapped && cell.mapped!=='email') rowWarns.push(`Email rescued from "${cell.header}"`)
        }
      }
      // Phone
      else if(looksLikePhone(v)){
        if(!ex.phone){ ex.phone=v; cell.used=true
          if(cell.mapped && cell.mapped!=='phone' && cell.mapped!=='alternate_phone')
            rowWarns.push(`Phone rescued from "${cell.header}"`)
        } else if(!ex.alternate_phone){ ex.alternate_phone=v; cell.used=true }
      }
      // URL (explicit https:// prefix)
      else if(RX_URL.test(v)){
        cell.used=true
        const { field, url } = resolveUrl(v)
        if(!ex[field]) ex[field]=url
      }
      // Bare domain URL (www.*, linkedin.com/*, github.com/*)
      else if(RX_URL_BARE.test(v)){
        cell.used=true
        const { field, url } = resolveUrl(v)
        if(!ex[field]) ex[field]=url
      }
    })

    // ── PASS 2: Header-mapped extraction (sorted: exact > partial match) ─────
    const pass2 = cells.filter(c=>!c.used && c.mapped).sort((a,b) => b.score - a.score)
    pass2.forEach(cell=>{
      const f=cell.mapped!; const v=cell.value!
      if(f==='talent_type'){ const m=fuzzyEnum(v,TALENT_TYPES); if(m){ex.talent_type=m;cell.used=true} }
      else if(f==='status'){ const m=fuzzyEnum(v,STATUSES); if(m){ex.status=m;cell.used=true} }
      else if(f==='source'){ const m=fuzzyEnum(v,SOURCES); if(m){ex.source=m;cell.used=true} }
      else if(f==='years_experience'){
        const n=num(v); if(n!==undefined&&n>=0&&n<=80){ex.years_experience=n;cell.used=true}
      }
      else if(f==='expected_compensation'||f==='overall_rating'){
        const n=num(v); if(n!==undefined){ex[f]=n;cell.used=true}
      }
      else if(f==='primary_skills'||f==='secondary_skills'||f==='certifications'||f==='domains'){
        const parsed=listVal(v)
        if(!ex[f] && parsed.length > 0){ex[f]=parsed;cell.used=true}
      }
      else if(f==='full_name' && !ex.full_name){
        // Handle "Last, First" → "First Last" format (common Excel export style)
        const commaParts=v.split(',').map(p=>p.trim()).filter(Boolean)
        if(commaParts.length===2 && !/\d/.test(v)){
          ex.full_name=`${commaParts[1]} ${commaParts[0]}`
        } else {
          ex.full_name=v
        }
        cell.used=true
      }
      else if(!ex[f]){
        // Sanitize CSV injection in any string field
        const sanitized=/^[=+\-@\t]/.test(v) ? `'${v}` : v
        ex[f]=sanitized; cell.used=true
      }
    })

    // ── PASS 3: Inference from unassigned or unmappable cells ────────────────
    cells.filter(c=>!c.used).forEach(cell=>{
      const v=cell.value!

      // Block CSV injection payloads
      if(/^[=+@\t]/.test(v)){ unassigned.push(`[BLOCKED: ${cell.header}=${v.slice(0,20)}]`); cell.used=true; return }

      // Experience: small number, not a year, not a compensation
      if(!ex.years_experience && looksLikeExp(v) && !looksLikeCompensation(v)){
        ex.years_experience=num(v); cell.used=true
        rowWarns.push(`Inferred experience "${v}" from unmapped column "${cell.header}"`)
      }
      // Compensation: large number
      else if(!ex.expected_compensation && looksLikeCompensation(v)){
        ex.expected_compensation=num(v); cell.used=true
        rowWarns.push(`Inferred compensation "${v}" from unmapped column "${cell.header}"`)
      }
      // Name: multi-word, not an enum value, not already found
      else if(!ex.full_name && RX_NAME.test(v.replace(/,/g,'')) && !ENUM_VALUES_SET.has(v.toLowerCase())){
        const wordCount=v.replace(/,/g,' ').trim().split(/\s+/).filter(Boolean).length
        if(wordCount>=2){
          ex.full_name=v.replace(/,\s*/g,' ').trim(); cell.used=true
          rowWarns.push(`Inferred name "${ex.full_name}" from unmapped column "${cell.header}"`)
        }
      }
      // Enum inference
      else if(!ex.status && fuzzyEnum(v,STATUSES)){
        ex.status=fuzzyEnum(v,STATUSES); cell.used=true
      }
      else if(!ex.source && fuzzyEnum(v,SOURCES)){
        ex.source=fuzzyEnum(v,SOURCES); cell.used=true
      }
      else if(!ex.talent_type && fuzzyEnum(v,TALENT_TYPES)){
        ex.talent_type=fuzzyEnum(v,TALENT_TYPES); cell.used=true
      }
      // Skills: delimited list with quality gate
      else if(v.includes(',')||v.includes('|')||v.includes(';')){
        const candidate=listVal(v)
        if(!ex.primary_skills && isQualitySkills(candidate)){
          ex.primary_skills=candidate; cell.used=true
          rowWarns.push(`Inferred skills from unmapped column "${cell.header}"`)
        } else if(ex.primary_skills && !isQualitySkills(ex.primary_skills as string[]) && isQualitySkills(candidate)){
          ex.primary_skills=candidate; cell.used=true
          rowWarns.push(`Upgraded skills from "${cell.header}"`)
        }
      }
      else {
        unassigned.push(v)
      }
    })

    // ── Identity check ────────────────────────────────────────────────────────
    const name=txt(ex.full_name as string)
    const email=txt(ex.email as string)
    const phone=txt(ex.phone as string)
    if(!name && !email && !phone){
      failedRows.push({rowNumber:rowNum,data:row,reason:'No identity marker found (Name, Email, or Phone).'})
      return
    }

    // ── Intra-file dedup ──────────────────────────────────────────────────────
    const keys=[email,phone].filter(Boolean).map(x=>String(x).toLowerCase())
    const isDup=keys.length>0 && keys.some(k=>seenKeys.has(k))
    if(!isDup) keys.forEach(k=>seenKeys.add(k))

    if(rowWarns.length) warnings.push(`Row ${rowNum}: ${rowWarns.join(' | ')}`)

    const fallbackName=name||(email?email.split('@')[0]:phone)||'Unknown'
    const allNotes=[txt(ex.notes as string),...unassigned.slice(0,5)].filter(Boolean).join(' | ')

    profiles.push({
      id:`bulk-${Date.now()}-${idx}-${Math.random().toString(36).slice(2,7)}`,
      organization_id:DEMO_ORG_ID,
      full_name:fallbackName,
      email, phone,
      alternate_phone:txt(ex.alternate_phone as string),
      talent_type:(ex.talent_type as TalentType)||'Other',
      source:(ex.source as TalentSource)||'Manual',
      status:(ex.status as TalentStatus)||'New',
      organization:txt(ex.organization as string),
      designation:txt(ex.designation as string),
      years_experience:ex.years_experience as number|undefined,
      location:txt(ex.location as string),
      availability:txt(ex.availability as string),
      expected_compensation:ex.expected_compensation as number|undefined,
      primary_skills:(ex.primary_skills as string[])||[],
      secondary_skills:(ex.secondary_skills as string[])||[],
      certifications:(ex.certifications as string[])||[],
      domains:(ex.domains as string[])||[],
      linkedin_url:txt(ex.linkedin_url as string),
      portfolio_url:txt(ex.portfolio_url as string),
      website:txt(ex.website as string),
      notes:allNotes||undefined,
      overall_rating:ex.overall_rating as number|undefined,
      is_shortlisted:false, is_favorite:false, is_active:true,
      raw_metadata:row, created_at:now, updated_at:now,
    })
  })

  return {profiles, failedRows, warnings:warnings.slice(0,200), columnMap, fileWarnings}
}

// ─── Export ───────────────────────────────────────────────────────────────────
export function profileToExportRow(p: TalentProfile): Record<ExportColumn,string|number> {
  return {
    'Full Name':p.full_name, Email:p.email??'', Phone:p.phone??'',
    'Alternate Phone':p.alternate_phone??'', 'Talent Type':p.talent_type,
    Source:p.source, Status:p.status, Organization:p.organization??'',
    Designation:p.designation??'', 'Years Experience':p.years_experience??'',
    Location:p.location??'', Availability:p.availability??'',
    'Expected Compensation':p.expected_compensation??'',
    'Primary Skills':p.primary_skills.join(', '),
    'Secondary Skills':p.secondary_skills.join(', '),
    Certifications:p.certifications.join(', '), Domains:p.domains.join(', '),
    'LinkedIn URL':p.linkedin_url??'', 'Portfolio URL':p.portfolio_url??'',
    Website:p.website??'', 'Overall Rating':p.overall_rating??'',
    Shortlisted:p.is_shortlisted?'Yes':'No', Favorite:p.is_favorite?'Yes':'No',
    Notes:p.notes??'', 'Created At':p.created_at, 'Updated At':p.updated_at,
  }
}

function blob(b: Blob, name: string) {
  const u=URL.createObjectURL(b), a=document.createElement('a')
  a.href=u; a.download=name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(u)
}

export function escape(v: string|number): string {
  let s=String(v)
  if(/^[=+\-@\t\r]/.test(s)) s="'"+s
  return /[",\n\r\t]/.test(s)?`"${s.replace(/"/g,'""')}"`:`${s}`
}

export async function exportProfiles(profiles: TalentProfile[], format: 'csv'|'xlsx', fileName='tih-profiles') {
  const rows=profiles.map(profileToExportRow)
  if(format==='csv'){
    const csv=[PROFILE_EXPORT_COLUMNS.join(','),...rows.map(r=>PROFILE_EXPORT_COLUMNS.map(c=>escape(r[c]??'')).join(','))].join('\n')
    blob(new Blob([csv],{type:'text/csv;charset=utf-8'}),`${fileName}.csv`); return
  }
  const data: SheetData=[[...PROFILE_EXPORT_COLUMNS],...rows.map(r=>PROFILE_EXPORT_COLUMNS.map(c=>r[c]??''))]
  await writeXlsxFile(data).toFile(`${fileName}.xlsx`)
}

export async function downloadTemplate(format: 'csv'|'xlsx') {
  const t: Record<ExportColumn,string|number>={
    'Full Name':'Jane Doe','Email':'jane.doe@example.com','Phone':'+1-555-0123',
    'Alternate Phone':'','Talent Type':'Employee','Source':'LinkedIn','Status':'New',
    'Organization':'Tech Corp','Designation':'Senior Engineer','Years Experience':5,
    'Location':'New York','Availability':'Immediate','Expected Compensation':120000,
    'Primary Skills':'React, Node.js','Secondary Skills':'AWS, Docker',
    'Certifications':'AWS Solutions Architect','Domains':'FinTech',
    'LinkedIn URL':'https://linkedin.com/in/janedoe','Portfolio URL':'https://github.com/janedoe',
    'Website':'https://janedoe.com','Overall Rating':4,'Shortlisted':'No','Favorite':'No',
    'Notes':'Strong frontend candidate','Created At':new Date().toISOString(),'Updated At':new Date().toISOString()
  }
  if(format==='csv'){
    const csv=[PROFILE_EXPORT_COLUMNS.join(','),PROFILE_EXPORT_COLUMNS.map(c=>escape(t[c]??'')).join(',')].join('\n')
    blob(new Blob([csv],{type:'text/csv;charset=utf-8'}),'tih-template.csv'); return
  }
  const data: SheetData=[[...PROFILE_EXPORT_COLUMNS],PROFILE_EXPORT_COLUMNS.map(c=>t[c]??'')]
  await writeXlsxFile(data).toFile('tih-template.xlsx')
}

export function filterProfilesForBulkPage(
  profiles: TalentProfile[],
  filters: {query:string;skill:string;location:string;minExperience:string;maxExperience:string;status:string;source:string;talentType:string}
) {
  const q=filters.query.trim().toLowerCase()
  const skills=filters.skill.split(/[,;]+/).map(x=>x.trim().toLowerCase()).filter(Boolean)
  const loc=filters.location.trim().toLowerCase()
  const minExp=num(filters.minExperience), maxExp=num(filters.maxExperience)
  return profiles.filter(p=>{
    if(!p.is_active) return false
    const s=[p.full_name,p.email,p.phone,p.organization,p.designation,p.location,p.notes,
      ...p.primary_skills,...p.secondary_skills,...p.certifications,...p.domains].filter(Boolean).join(' ').toLowerCase()
    const allSkills=[...p.primary_skills,...p.secondary_skills].map(x=>x.toLowerCase())
    const yrs=p.years_experience??0
    return (!q||s.includes(q))&&
      (!skills.length||skills.every(t=>allSkills.some(x=>x.includes(t))))&&
      (!loc||p.location?.toLowerCase().includes(loc))&&
      (minExp===undefined||yrs>=minExp)&&(maxExp===undefined||yrs<=maxExp)&&
      (!filters.status||p.status===filters.status)&&
      (!filters.source||p.source===filters.source)&&
      (!filters.talentType||p.talent_type===filters.talentType)
  })
}

export function removeDuplicateProfiles(incoming: TalentProfile[], existing: TalentProfile[]) {
  const seen=new Set(existing.flatMap(p=>[p.email,p.phone].filter(Boolean).map(v=>String(v).toLowerCase())))
  const duplicates: TalentProfile[]=[], unique: TalentProfile[]=[]
  incoming.forEach(p=>{
    const keys=[p.email,p.phone].filter(Boolean).map(v=>String(v).toLowerCase())
    if(keys.length>0&&keys.some(k=>seen.has(k))){ duplicates.push(p); return }
    keys.forEach(k=>seen.add(k)); unique.push(p)
  })
  return {unique,duplicates}
}
