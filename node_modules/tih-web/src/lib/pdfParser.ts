/**
 * AI Resume Parser
 *
 * Architecture (inspired by orasik/resume-parser + Sajjad-Amjad/Resume-Parser):
 *   1. Extract raw text from PDF (pdfjs, position-based line grouping)
 *      OR from DOCX (mammoth html→text)
 *   2. Send to Claude claude-haiku via Anthropic API with a structured JSON prompt
 *   3. Parse + validate the JSON response
 *   4. Fall back to heuristic extraction if no API key or API call fails
 *
 * Setup: add VITE_ANTHROPIC_API_KEY to .env.local for AI mode.
 * Without it the parser runs in heuristic mode (still useful, but less accurate).
 */

import type { TalentProfile } from '../types/database'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ParsedResume {
  full_name?: string
  email?: string
  phone?: string
  location?: string
  linkedin_url?: string
  portfolio_url?: string
  designation?: string
  organization?: string
  years_experience?: number
  primary_skills: string[]
  secondary_skills: string[]
  certifications: string[]
  industry_domains: string[]
  education?: string
  summary?: string
  notes?: string
  rawText: string
  parseMode: 'ai' | 'heuristic'
}

// ── Text Extraction: PDF ──────────────────────────────────────────────────────

/**
 * Groups pdfjs text items by Y-coordinate so lines are reconstructed in
 * reading order.  This is the same position-based approach used by OpenResume.
 */
async function extractTextFromPDF(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist')
  const workerUrl = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl.default

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  const pageLines: string[] = []

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const content = await page.getTextContent()

    // Group by rounded Y with a tolerance of 3 pixels (PDF coords are bottom-up)
    const lineMap = new Map<number, { x: number; width: number; text: string }[]>()
    for (const item of content.items) {
      if (!('str' in item) || !item.str.trim()) continue
      const y = Math.round(item.transform[5] / 3) * 3
      const x = item.transform[4]
      const width = item.width
      const bucket = lineMap.get(y) ?? []
      bucket.push({ x, width, text: item.str })
      lineMap.set(y, bucket)
    }

    const sortedYs = [...lineMap.keys()].sort((a, b) => b - a)
    for (const y of sortedYs) {
      const items = lineMap.get(y)!.sort((a, b) => a.x - b.x)
      let lineText = ''
      let lastRightEdge = -1

      for (const item of items) {
        // If the gap between the end of the last item and the start of this item is > 3 pixels,
        // we treat it as a distinct word boundary and insert a space.
        if (lastRightEdge !== -1 && (item.x - lastRightEdge) > 3) {
          lineText += ' '
        }
        lineText += item.text
        lastRightEdge = item.x + item.width
      }

      const cleanLine = lineText.replace(/\s+/g, ' ').trim()
      if (cleanLine) pageLines.push(cleanLine)
    }

    if (pageNum < pdf.numPages) pageLines.push('')
  }

  return pageLines.join('\n')
}

// ── Text Extraction: DOCX ─────────────────────────────────────────────────────

async function extractTextFromDOCX(file: File): Promise<string> {
  // mammoth converts DOCX → HTML then we strip tags to get clean text
  const mammoth = await import('mammoth')
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value
}

// ── Main text extractor (dispatches by file type) ─────────────────────────────

async function extractRawText(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase()
  const mime = file.type

  if (ext === 'pdf') {
    if (mime && mime !== 'application/pdf' && !mime.startsWith('application/')) {
      throw new Error('Invalid file type. Expected a PDF file.')
    }
    return extractTextFromPDF(file)
  }
  if (ext === 'docx') {
    if (mime && !mime.includes('wordprocessingml') && mime !== 'application/msword' && mime !== '') {
      // Allow empty MIME (some OS don't set it) but reject clearly wrong types
    }
    return extractTextFromDOCX(file)
  }
  if (ext === 'doc') return extractTextFromDOCX(file)
  throw new Error(`Unsupported file type: .${ext}. Upload a PDF or DOCX.`)
}

// ── AI Parsing (Groq) ────────────────────────────────────────────────────────

const AI_PROMPT = `You are an expert resume data extraction API. Extract structured fields from the resume text below and return ONLY a valid JSON object — no markdown fences, no prose, no explanation.

JSON schema (return exactly these keys):
{
  "full_name": string | null,
  "email": string | null,
  "phone": string | null,
  "location": string | null,
  "linkedin_url": string | null,
  "portfolio_url": string | null,
  "designation": string | null,
  "organization": string | null,
  "years_experience": number | null,
  "primary_skills": string[],
  "secondary_skills": string[],
  "certifications": string[],
  "industry_domains": string[],
  "education": string | null,
  "summary": string | null
}

Field-by-field extraction rules:
- full_name: Full legal name from the top of the resume. Do NOT return job titles, company names, or section headers.
- email: Exact email address string (e.g. "john@example.com"). Only the first one if multiple exist.
- phone: Phone number including country code if present (e.g. "+91 9876543210"). Only the primary number.
- location: City, State or City, Country (e.g. "Bangalore, India" or "Austin, TX"). Omit street address.
- linkedin_url: Full LinkedIn profile URL (e.g. "https://linkedin.com/in/username"). Return null if not present.
- portfolio_url: GitHub profile or personal portfolio/website URL. Return null if not present.
- designation: The most recent job title EXACTLY as written (e.g. "Senior Software Engineer"). Do NOT paraphrase.
- organization: The most recent employer company name EXACTLY as written. Do NOT paraphrase.
- years_experience: INTEGER. Calculate by summing the months/years of all listed work experience roles then converting to full years. If the resume says "5+ years" explicitly, use that. Return null only if completely impossible to determine.
- primary_skills: Array of 6–10 individual technical/professional skills. Pull from BOTH the skills section AND work experience bullets. Each item is a skill name only (e.g. "React", "Python", "AWS") — NOT a sentence.
- secondary_skills: Array of up to 8 additional skills not already in primary_skills.
- certifications: Array of professional certifications (e.g. "AWS Certified Solutions Architect"). Do NOT include university degrees here.
- industry_domains: Array of industries the person has worked in, inferred from employers/projects (e.g. "FinTech", "Healthcare", "SaaS").
- education: Highest degree + field + institution as a single string (e.g. "B.Tech Computer Science, IIT Bombay"). Return null if no education section.
- summary: 1–2 sentence professional summary. Synthesize from the resume's objective/summary section or their overall profile. Be factual, no fluff.

Strict rules:
- Return null (not "" and not "Not provided") when a field cannot be found.
- Do NOT invent or infer contact details — email, phone, linkedin_url must literally appear in the text.
- Extract individual skill tokens, not sentences or paragraphs.
- Deduplicate skills — each skill appears only once across primary_skills and secondary_skills combined.

Resume text:
`

function cleanList(values: string[]): string[] {
  return values
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value) => !/^null|none|n\/a|not\s+found$/i.test(value))
    .filter((value, index, arr) => arr.findIndex((item) => item.toLowerCase() === value.toLowerCase()) === index)
}

function parseJsonObject(text: string): Record<string, unknown> {
  const withoutFence = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  try {
    return JSON.parse(withoutFence) as Record<string, unknown>
  } catch {
    const start = withoutFence.indexOf('{')
    const end = withoutFence.lastIndexOf('}')
    if (start >= 0 && end > start) {
      return JSON.parse(withoutFence.slice(start, end + 1)) as Record<string, unknown>
    }
    throw new Error('AI parser returned invalid JSON')
  }
}

/**
 * Retries a fetch call up to `retries` times with exponential backoff.
 * Specifically retries on HTTP 429 (rate limit) and network errors.
 */
async function fetchWithRetry(url: string, options: RequestInit, retries = 2, baseDelay = 1000): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options)
      if (res.status === 429 && attempt < retries) {
        await new Promise((r) => setTimeout(r, baseDelay * Math.pow(2, attempt)))
        continue
      }
      return res
    } catch (err) {
      if (attempt === retries) throw err
      await new Promise((r) => setTimeout(r, baseDelay * Math.pow(2, attempt)))
    }
  }
  throw new Error('Max retries exceeded')
}

async function parseWithAI(rawText: string): Promise<Partial<ParsedResume>> {
  // Check for the Groq API key (fallback to old Anthropic name if user hasn't renamed it)
  const apiKey = (import.meta.env.VITE_GROQ_API_KEY || import.meta.env.VITE_ANTHROPIC_API_KEY) as string | undefined
  // llama-3.3-70b-versatile has strong instruction-following; gemma2-9b-it is fast fallback
  const model = (import.meta.env.VITE_GROQ_MODEL || 'llama-3.3-70b-versatile') as string
  if (!apiKey) throw new Error('No API key — using heuristic mode')

  // Trim to 18000 chars from the start — best resume info is at the top
  const trimmedText = rawText.length > 18000 ? rawText.slice(0, 18000) + '\n[... truncated]' : rawText

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout

  const response = await fetchWithRetry('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    signal: controller.signal,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 2048,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You are a precise JSON data extraction API for resume parsing. Return only valid JSON, no prose.',
        },
        {
          role: 'user',
          content: AI_PROMPT + trimmedText,
        },
      ],
    }),
  })

  clearTimeout(timeoutId)

  if (response.status === 429) {
    throw new Error('Groq API rate limit exceeded — using heuristic mode')
  }

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Groq API error ${response.status}: ${err}`)
  }

  const data = await response.json() as {
    choices: { message: { content: string } }[]
  }

  const text = data.choices[0]?.message?.content ?? ''

  const parsed = parseJsonObject(text)

  const ensureStringArray = (v: unknown): string[] => {
    if (typeof v === 'string') return cleanList(v.split(/[,;|/\n]+/))
    if (Array.isArray(v)) return cleanList(v.map(String))
    return []
  }

  const ensureString = (v: unknown): string | undefined => {
    if (typeof v === 'string') {
      const trimmed = v.trim()
      if (!trimmed || /^null|none|n\/a|not\s+found$/i.test(trimmed)) return undefined
      return trimmed
    }
    if (typeof v === 'number') return String(v)
    if (Array.isArray(v) && v.length > 0) return String(v[0]).trim() || undefined
    return undefined
  }

  const ensureNumber = (v: unknown): number | undefined => {
    if (typeof v === 'number') return v >= 0 && v < 60 ? v : undefined
    if (typeof v === 'string') {
      const match = v.match(/\d+(?:\.\d+)?/)
      if (match) {
        const parsed = Number(match[0])
        return parsed >= 0 && parsed < 60 ? parsed : undefined
      }
    }
    return undefined
  }

  return {
    full_name: ensureString(parsed.full_name),
    email: ensureString(parsed.email),
    phone: ensureString(parsed.phone),
    location: ensureString(parsed.location),
    linkedin_url: ensureString(parsed.linkedin_url),
    portfolio_url: ensureString(parsed.portfolio_url),
    designation: ensureString(parsed.designation),
    organization: ensureString(parsed.organization),
    years_experience: ensureNumber(parsed.years_experience),
    primary_skills: ensureStringArray(parsed.primary_skills),
    secondary_skills: ensureStringArray(parsed.secondary_skills),
    certifications: ensureStringArray(parsed.certifications),
    industry_domains: ensureStringArray(parsed.industry_domains),
    education: ensureString(parsed.education),
    summary: ensureString(parsed.summary),
    parseMode: 'ai' as const,
  }
}

// ── Heuristic Fallback ────────────────────────────────────────────────────────
// Used when no API key is present or API call fails.

function heuristicEmail(text: string) {
  return text.match(/[\w.+'-]+@[\w-]+\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?/)?.[0]?.toLowerCase()
}

function heuristicPhone(text: string) {
  const patterns = [
    /\+91[\s\-]?[6-9]\d{4}[\s\-]?\d{5}/,
    /(?<!\d)[6-9]\d{9}(?!\d)/,
    /\+1[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{4}/,
    /\+\d{1,3}[\s\-]?\(?\d{2,4}\)?[\s\-]?\d{3,4}[\s\-]?\d{3,4}/,
    /\(?\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4}(?!\d)/,
    /(?<!\d)\d{10}(?!\d)/,
  ]
  for (const p of patterns) {
    const m = text.match(p)
    if (m) return m[0].trim()
  }
}

function heuristicLinkedIn(text: string) {
  const m = text.match(/linkedin\.com\/in\/([a-zA-Z0-9\-_]+)/i)
  return m ? `https://linkedin.com/in/${m[1]}` : undefined
}

function heuristicPortfolio(text: string) {
  const m = text.match(/github\.com\/([a-zA-Z0-9\-_]+)/i)
  if (m) return `https://github.com/${m[1]}`
  const web = text.match(/(?:portfolio|website)[:\s]+([https://]?[\w\-.]+\.(?:io|dev|me|com|co)\/[^\s]*)/i)
  return web ? (web[1].startsWith('http') ? web[1] : `https://${web[1]}`) : undefined
}

function heuristicName(lines: string[]) {
  for (const line of lines.slice(0, 8)) {
    const t = line.trim()
    if (!t || t.length > 60 || /[@\d{4}]/.test(t)) continue
    if (/^(resume|cv|curriculum|vitae|contact|summary|profile|about|skills?|experience|education|objective)\b/i.test(t)) continue
    const words = t.split(/\s+/).filter(Boolean)
    if (words.length < 1 || words.length > 5) continue
    if (words.every((w) => /^[a-zA-Z.''\-]{1,}$/.test(w))) {
      return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
    }
  }
}

function heuristicLocation(text: string) {
  const m = text.match(/([A-Z][a-zA-Z\s]+),\s*([A-Z]{2}|[A-Z][a-zA-Z\s]+)/)
  if (m && m[0].length < 50 && !/\d/.test(m[0])) return m[0].trim()
  const CITIES = [
    'Mumbai', 'Delhi', 'New Delhi', 'Bangalore', 'Bengaluru', 'Hyderabad', 'Chennai',
    'Pune', 'Kolkata', 'Ahmedabad', 'Noida', 'Gurgaon', 'Gurugram', 'Kochi', 'Chandigarh',
    'New York', 'San Francisco', 'Los Angeles', 'Chicago', 'Seattle', 'Austin', 'Boston',
    'London', 'Singapore', 'Dubai', 'Toronto', 'Sydney', 'Remote',
  ]
  for (const c of CITIES) {
    if (new RegExp(`\\b${c}\\b`, 'i').test(text)) return c
  }
}

function heuristicYearsExp(text: string) {
  const patterns = [
    /(\d+)\+?\s*(?:years?|yrs?)(?:\s+of)?\s*(?:experience|exp(?:erience)?|work)/i,
    /(?:experience|exp)\s*[:\-]?\s*(\d+)\+?\s*(?:years?|yrs?)/i,
    /total\s+(?:of\s+)?(\d+)\+?\s*(?:years?|yrs?)/i,
    /(\d+)\+?\s*(?:years?|yrs?)\s+(?:in|of|as)\s/i,
  ]
  for (const p of patterns) {
    const m = text.match(p)
    if (m) {
      const v = parseInt(m[1], 10)
      if (v > 0 && v < 60) return v
    }
  }
}

function heuristicDesignation(text: string) {
  const TITLES = [
    'Principal Engineer', 'Staff Engineer', 'Senior Software Engineer', 'Software Engineer',
    'Senior Engineer', 'Software Developer', 'Senior Developer', 'Junior Developer',
    'Full Stack Developer', 'Full-Stack Developer', 'Frontend Developer', 'Backend Developer',
    'iOS Developer', 'Android Developer', 'Mobile Developer', 'React Developer',
    'DevOps Engineer', 'Site Reliability Engineer', 'SRE', 'Cloud Architect',
    'Solutions Architect', 'Technical Architect', 'Platform Engineer',
    'Data Scientist', 'Senior Data Scientist', 'Data Engineer', 'Machine Learning Engineer',
    'ML Engineer', 'AI Engineer', 'Research Scientist', 'Data Analyst',
    'Engineering Manager', 'VP Engineering', 'CTO', 'Head of Engineering',
    'Tech Lead', 'Technical Lead', 'Team Lead',
    'Product Manager', 'Senior Product Manager', 'Project Manager', 'Scrum Master',
    'UX Designer', 'UI Designer', 'Product Designer',
    'Business Analyst', 'Consultant', 'Senior Consultant',
    'Trainer', 'Corporate Trainer', 'Freelancer', 'Mentor', 'Coach',
    'QA Engineer', 'QA Lead', 'Test Engineer', 'Security Engineer',
    'System Administrator', 'Network Engineer',
  ]
  const lower = text.toLowerCase()
  for (const t of TITLES) if (lower.includes(t.toLowerCase())) return t
}

function heuristicOrg(text: string) {
  const m = text.match(
    /([A-Z][A-Za-z0-9\s&.'-]{2,40}?)\s*(?:Inc\.?|Ltd\.?|LLC|LLP|Corp\.?|Technologies|Solutions|Systems|Consulting|Group|Pvt)/
  )
  return m?.[1]?.trim()
}

const KNOWN_SKILLS = [
  'Python','JavaScript','TypeScript','Java','C++','C#','Go','Rust','Ruby','PHP','Swift','Kotlin','R','Scala','Dart','Bash','SQL','PL/SQL',
  'React','React.js','Next.js','Vue','Vue.js','Angular','Svelte','HTML','HTML5','CSS','CSS3','SASS','Tailwind','Bootstrap',
  'Redux','GraphQL','Apollo','Webpack','Vite','Jest','Cypress','Playwright',
  'Node.js','Express','Django','FastAPI','Flask','Spring','Spring Boot','Rails','Laravel','ASP.NET','.NET','gRPC','REST API','Microservices',
  'Machine Learning','Deep Learning','AI','NLP','Computer Vision','TensorFlow','PyTorch','Keras','Scikit-learn','Pandas','NumPy','OpenCV',
  'BERT','GPT','LLM','Transformers','Hugging Face','Data Science','Data Analysis','MLOps','A/B Testing',
  'Tableau','Power BI','Looker','Apache Spark','Kafka','Airflow','dbt','ETL','Snowflake','BigQuery','Redshift','Databricks',
  'AWS','Azure','GCP','Google Cloud','Docker','Kubernetes','Terraform','Ansible','CI/CD','Jenkins','GitHub Actions','GitLab CI',
  'Linux','Nginx','Serverless','Lambda','Prometheus','Grafana','Datadog',
  'PostgreSQL','MySQL','MongoDB','Redis','Elasticsearch','DynamoDB','Cassandra','Firebase','Supabase',
  'React Native','Flutter','iOS','Android','Expo','SwiftUI','Jetpack Compose',
  'Figma','Sketch','Adobe XD','UI Design','UX Design','UX Research','Prototyping','Design Systems',
  'Agile','Scrum','Kanban','JIRA','Confluence','Git','GitHub','GitLab',
  'Product Management','Project Management','Business Analysis','Public Speaking','Leadership','Training','Coaching',
  'Digital Marketing','SEO','SEM','Blockchain','Web3','IoT','Embedded Systems','Cybersecurity',
]

function heuristicSkills(text: string): { primary: string[]; secondary: string[] } {
  const found: string[] = []
  for (const skill of KNOWN_SKILLS) {
    const escaped = skill.replace(/[.+*()?[\]{}^$|\\]/g, '\\$&')
    if (new RegExp(`(?:^|[\\s,/|•·(])${escaped}(?:[\\s,/|•·)]|$)`, 'i').test(text)) {
      if (!found.some((f) => f.toLowerCase() === skill.toLowerCase())) found.push(skill)
    }
  }
  // also tokenize skills section
  const section = text.match(/(?:skills?|technical\s+skills?|technologies?)[:\s\n]+([\s\S]{0,800})(?:\n\n|\n[A-Z])/i)
  if (section) {
    const tokens = section[1].split(/[,•·|\n\/]/).map((s) => s.trim()).filter((s) => s.length > 1 && s.length < 40)
    for (const t of tokens) {
      if (!found.some((f) => f.toLowerCase() === t.toLowerCase()) && /^[a-zA-Z0-9\s.#/+'-]+$/.test(t)) {
        found.push(t)
      }
    }
  }
  const all = [...new Set(found)]
  return { primary: all.slice(0, 8), secondary: all.slice(8, 16) }
}

function heuristicCerts(text: string): string[] {
  const PATS = [
    /AWS\s+Certified[\w\s]+/i, /Azure\s+(?:Certified|Administrator|Developer|Solutions\s+Architect)[\w\s]*/i,
    /Google\s+(?:Cloud|Certified|Professional)[\w\s]*/i, /PMP\b/i, /(?:Certified\s+)?Scrum\s+Master/i,
    /CSM\b/, /CISSP\b/, /CISA\b/, /CEH\b/, /CompTIA\s+[\w+]+/i, /Cisco\s+[\w\s]+/i,
    /CCNA\b/, /CCNP\b/, /CKA\b/, /CKAD\b/, /ITIL\b/, /Six\s+Sigma/i, /SAFe\b/,
    /TensorFlow\s+Developer/i, /Deep\s+Learning\s+Specialization/i, /Salesforce\s+[\w\s]+/i,
  ]
  const found: string[] = []
  for (const p of PATS) {
    const m = text.match(p)
    if (m) found.push(m[0].trim())
  }
  return [...new Set(found)].slice(0, 8)
}

function heuristicDomains(text: string): string[] {
  const DOMAINS = [
    'EdTech','FinTech','Healthcare','E-commerce','Retail','Banking','Insurance','Telecom',
    'Manufacturing','Logistics','Supply Chain','Real Estate','Media','Entertainment','Gaming',
    'Travel','Hospitality','Legal','Government','Aerospace','Energy','Agriculture',
    'SaaS','B2B','B2C','Enterprise','Startup','Consulting','Cybersecurity','Blockchain','Web3','IoT',
  ]
  return DOMAINS.filter((d) => new RegExp(`\\b${d.replace(/[+.]/g, '\\$&')}\\b`, 'i').test(text)).slice(0, 5)
}

function heuristicEducation(text: string) {
  const section = text.match(/(?:education|academic\s+background|qualification)[:\s\n]+([\s\S]{0,500})(?:\n\n|\n[A-Z][A-Z\s]{3,})/i)
  if (section) {
    const firstLine = section[1].split('\n').map((line) => line.trim()).find(Boolean)
    if (firstLine) return firstLine.slice(0, 180)
  }

  const degree = text.match(/\b(?:B\.?Tech|M\.?Tech|B\.?E\.?|M\.?E\.?|B\.?Sc|M\.?Sc|MBA|BCA|MCA|Ph\.?D|Bachelor(?:'s)?|Master(?:'s)?)\b[^\n]{0,120}/i)
  return degree?.[0]?.trim()
}

function parseHeuristic(rawText: string): Partial<ParsedResume> {
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean)
  const { primary, secondary } = heuristicSkills(rawText)
  return {
    full_name: heuristicName(lines),
    email: heuristicEmail(rawText),
    phone: heuristicPhone(rawText),
    location: heuristicLocation(rawText),
    linkedin_url: heuristicLinkedIn(rawText),
    portfolio_url: heuristicPortfolio(rawText),
    designation: heuristicDesignation(rawText),
    organization: heuristicOrg(rawText),
    years_experience: heuristicYearsExp(rawText),
    primary_skills: primary,
    secondary_skills: secondary,
    certifications: heuristicCerts(rawText),
    industry_domains: heuristicDomains(rawText),
    education: heuristicEducation(rawText),
    parseMode: 'heuristic' as const,
  }
}

/**
 * Deduplicates a skills array by normalizing each skill to a lowercase key
 * with spaces, dots, and hyphens removed. Preserves original casing of first occurrence.
 */
export function dedupeSkills(skills: string[]): string[] {
  const seen = new Set<string>()
  return skills.filter((s) => {
    const key = s.toLowerCase().replace(/[.\s\-]/g, '')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function valueAppearsInText(value: string | undefined, rawText: string) {
  if (!value) return false
  return rawText.toLowerCase().includes(value.toLowerCase())
}

/**
 * Merges AI and heuristic parse results with AI taking priority.
 * Cross-validates email/phone against raw text to prevent AI hallucination.
 * Heuristic results fill any gaps left by the AI parser.
 */
function normalizeParsedResume(parsed: Partial<ParsedResume>, rawText: string): Partial<ParsedResume> {
  const fallback = parseHeuristic(rawText)

  // AI results take priority. Heuristic fills in only when AI returned null/undefined.
  // Exception: regex-validated heuristic results for email/phone are used to cross-check AI.
  const hEmail = heuristicEmail(rawText)
  const hPhone = heuristicPhone(rawText)
  const hLinkedin = heuristicLinkedIn(rawText)
  const hPortfolio = heuristicPortfolio(rawText)

  // Validate that AI-returned contact fields actually appear in raw text (prevent hallucination)
  const aiEmail = parsed.email && valueAppearsInText(parsed.email.split('@')[0], rawText) ? parsed.email : undefined
  const aiPhone = parsed.phone && valueAppearsInText(parsed.phone.replace(/[\s\-+()]/g, '').slice(-8), rawText) ? parsed.phone : undefined
  const aiLinkedin = parsed.linkedin_url && valueAppearsInText('linkedin', rawText) ? parsed.linkedin_url : undefined
  const aiPortfolio = parsed.portfolio_url && valueAppearsInText(parsed.portfolio_url.replace(/https?:\/\//, '').split('/')[0], rawText) ? parsed.portfolio_url : undefined

  // Skills: AI primary skills take priority (they are contextually identified).
  // Add unique heuristic skills (from KNOWN_SKILLS list) as supplementary secondary skills.
  const aiPrimary = cleanList(parsed.primary_skills ?? [])
  const aiSecondary = cleanList(parsed.secondary_skills ?? [])
  const aiAllSkills = cleanList([...aiPrimary, ...aiSecondary])
  const aiAllLower = new Set(aiAllSkills.map((s) => s.toLowerCase()))

  const hAllSkills = cleanList([...(fallback.primary_skills ?? []), ...(fallback.secondary_skills ?? [])])
  const uniqueHeuristic = hAllSkills.filter((s) => !aiAllLower.has(s.toLowerCase()))

  const mergedPrimary = dedupeSkills(aiPrimary.length > 0 ? aiPrimary.slice(0, 10) : uniqueHeuristic.slice(0, 10))
  const mergedSecondary = dedupeSkills(
    aiSecondary.length > 0
      ? cleanList([...aiSecondary, ...uniqueHeuristic]).filter((s) => !mergedPrimary.some((p) => p.toLowerCase() === s.toLowerCase())).slice(0, 10)
      : uniqueHeuristic.slice(10, 20)
  )

  return {
    ...parsed,
    full_name: parsed.full_name || fallback.full_name,
    email: aiEmail || hEmail,
    phone: aiPhone || hPhone,
    linkedin_url: aiLinkedin || hLinkedin,
    portfolio_url: aiPortfolio || hPortfolio,
    location: parsed.location || fallback.location,
    designation: parsed.designation || fallback.designation,
    organization: parsed.organization || fallback.organization,
    years_experience: parsed.years_experience ?? fallback.years_experience,
    primary_skills: mergedPrimary,
    secondary_skills: mergedSecondary,
    certifications: cleanList([...(parsed.certifications ?? []), ...(fallback.certifications ?? [])]).slice(0, 12),
    industry_domains: cleanList([...(parsed.industry_domains ?? []), ...(fallback.industry_domains ?? [])]).slice(0, 8),
    education: parsed.education || fallback.education,
    parseMode: parsed.parseMode ?? fallback.parseMode,
  }
}

// ── Main Entry Point ──────────────────────────────────────────────────────────

export async function parseResumeFromFile(file: File): Promise<ParsedResume> {
  const rawText = await extractRawText(file)

  let parsed: Partial<ParsedResume>

  try {
    parsed = normalizeParsedResume(await parseWithAI(rawText), rawText)
  } catch {
    // API unavailable or no key — use heuristic
    parsed = normalizeParsedResume(parseHeuristic(rawText), rawText)
  }

  return {
    full_name: parsed.full_name,
    email: parsed.email,
    phone: parsed.phone,
    location: parsed.location,
    linkedin_url: parsed.linkedin_url,
    portfolio_url: parsed.portfolio_url,
    designation: parsed.designation,
    organization: parsed.organization,
    years_experience: parsed.years_experience,
    primary_skills: parsed.primary_skills ?? [],
    secondary_skills: parsed.secondary_skills ?? [],
    certifications: parsed.certifications ?? [],
    industry_domains: parsed.industry_domains ?? [],
    education: parsed.education,
    summary: parsed.summary,
    notes: `Parsed from ${file.name} (${parsed.parseMode === 'ai' ? 'AI' : 'heuristic'} mode)`,
    rawText,
    parseMode: parsed.parseMode ?? 'heuristic',
  }
}

/** Convert ParsedResume → partial TalentProfile for form auto-fill */
export function parsedToProfile(parsed: ParsedResume): Partial<TalentProfile> {
  return {
    full_name: parsed.full_name || '',
    email: parsed.email,
    phone: parsed.phone,
    location: parsed.location,
    linkedin_url: parsed.linkedin_url,
    portfolio_url: parsed.portfolio_url,
    website: parsed.portfolio_url,
    designation: parsed.designation,
    organization: parsed.organization,
    years_experience: parsed.years_experience,
    primary_skills: parsed.primary_skills,
    secondary_skills: parsed.secondary_skills,
    certifications: parsed.certifications,
    domains: parsed.industry_domains,
    notes: parsed.summary
      ? `${parsed.summary}\n\n[Parsed from ${parsed.parseMode === 'ai' ? 'AI' : 'heuristic'} mode]`
      : parsed.notes,
  }
}
