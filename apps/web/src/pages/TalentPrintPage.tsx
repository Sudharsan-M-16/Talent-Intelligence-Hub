import { useParams, Link } from 'react-router-dom'
import { useTalentStore } from '../store/talentStore'

export default function TalentPrintPage() {
  const { id } = useParams<{ id: string }>()
  const { profiles } = useTalentStore()
  const profile = profiles.find((p) => p.id === id)

  if (!profile) {
    return (
      <div style={{ padding: 40, fontFamily: 'sans-serif', color: '#111' }}>
        <p>Profile not found.</p>
        <Link to="/talent" style={{ color: '#5e6ad2' }}>Back to Talent List</Link>
      </div>
    )
  }

  const avgRating =
    profile.evaluations && profile.evaluations.length > 0
      ? (
          profile.evaluations.reduce((sum, ev) => sum + ev.overall_score, 0) /
          profile.evaluations.length
        ).toFixed(1)
      : profile.overall_rating?.toFixed(1) ?? null

  const latestFeedback =
    profile.evaluations && profile.evaluations.length > 0
      ? profile.evaluations[profile.evaluations.length - 1].feedback
      : null

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
        }
        @page { margin: 20mm; }
        * { box-sizing: border-box; }
      `}</style>

      {/* Action bar — hidden on print */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          padding: '12px 24px',
          background: '#f8f8f8',
          borderBottom: '1px solid #e0e0e0',
          fontFamily: 'Figtree, sans-serif',
        }}
      >
        <Link
          to={`/talent/${id}`}
          style={{
            fontSize: 13,
            color: '#5e6ad2',
            textDecoration: 'none',
            fontWeight: 500,
          }}
        >
          ← Back to Profile
        </Link>
        <button
          onClick={() => window.print()}
          style={{
            marginLeft: 'auto',
            padding: '7px 18px',
            background: '#5e6ad2',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'Figtree, sans-serif',
          }}
        >
          Print / Save as PDF
        </button>
      </div>

      {/* Print content */}
      <div
        style={{
          maxWidth: 780,
          margin: '0 auto',
          padding: '32px 40px',
          background: '#ffffff',
          color: '#111111',
          fontFamily: 'Georgia, serif',
          minHeight: '100vh',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: 28, borderBottom: '2px solid #111', paddingBottom: 20 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, color: '#111', fontFamily: 'Arial, sans-serif' }}>
            {profile.full_name}
          </h1>
          <div style={{ marginTop: 8, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#5e6ad2',
                fontFamily: 'Arial, sans-serif',
              }}
            >
              {profile.talent_type}
            </span>
            <span style={{ color: '#bbb' }}>·</span>
            <span
              style={{
                fontSize: 12,
                padding: '2px 10px',
                borderRadius: 4,
                border: '1px solid #ccc',
                color: '#555',
                fontFamily: 'Arial, sans-serif',
                fontWeight: 600,
              }}
            >
              {profile.status}
            </span>
            {profile.designation && (
              <>
                <span style={{ color: '#bbb' }}>·</span>
                <span style={{ fontSize: 13, color: '#444', fontFamily: 'Arial, sans-serif' }}>
                  {profile.designation}
                  {profile.organization ? ` at ${profile.organization}` : ''}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Two-column info grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 40px', marginBottom: 28 }}>
          {/* Left: Contact info */}
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#888',
                marginBottom: 10,
                fontFamily: 'Arial, sans-serif',
              }}
            >
              Contact
            </div>
            {profile.email && (
              <Row label="Email" value={profile.email} />
            )}
            {profile.phone && (
              <Row label="Phone" value={profile.phone} />
            )}
            {profile.alternate_phone && (
              <Row label="Alt. Phone" value={profile.alternate_phone} />
            )}
            {profile.location && (
              <Row label="Location" value={profile.location} />
            )}
            {profile.linkedin_url && (
              <Row label="LinkedIn" value={profile.linkedin_url} />
            )}
          </div>

          {/* Right: Professional info */}
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#888',
                marginBottom: 10,
                fontFamily: 'Arial, sans-serif',
              }}
            >
              Professional
            </div>
            {profile.years_experience != null && (
              <Row label="Experience" value={`${profile.years_experience} year${profile.years_experience !== 1 ? 's' : ''}`} />
            )}
            {profile.expected_compensation != null && (
              <Row label="Compensation" value={`₹${profile.expected_compensation.toLocaleString()}`} />
            )}
            {profile.availability && (
              <Row label="Availability" value={profile.availability} />
            )}
            <Row label="Source" value={profile.source} />
          </div>
        </div>

        {/* Skills */}
        {(profile.primary_skills.length > 0 || profile.secondary_skills.length > 0) && (
          <div style={{ marginBottom: 28 }}>
            <SectionTitle>Skills</SectionTitle>
            {profile.primary_skills.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 6, fontFamily: 'Arial, sans-serif' }}>Primary</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {profile.primary_skills.map((skill) => (
                    <span
                      key={skill}
                      style={{
                        padding: '3px 10px',
                        background: '#111',
                        color: '#fff',
                        borderRadius: 4,
                        fontSize: 12,
                        fontFamily: 'Arial, sans-serif',
                        fontWeight: 500,
                      }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {profile.secondary_skills.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 6, fontFamily: 'Arial, sans-serif' }}>Secondary</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {profile.secondary_skills.map((skill) => (
                    <span
                      key={skill}
                      style={{
                        padding: '3px 10px',
                        background: '#f4f4f4',
                        color: '#333',
                        border: '1px solid #ddd',
                        borderRadius: 4,
                        fontSize: 12,
                        fontFamily: 'Arial, sans-serif',
                      }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Certifications */}
        {profile.certifications.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <SectionTitle>Certifications</SectionTitle>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {profile.certifications.map((cert) => (
                <li key={cert} style={{ fontSize: 13, color: '#333', marginBottom: 4, fontFamily: 'Arial, sans-serif' }}>
                  {cert}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Evaluations summary */}
        {avgRating && (
          <div style={{ marginBottom: 28 }}>
            <SectionTitle>Evaluation Summary</SectionTitle>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: latestFeedback ? 12 : 0 }}>
              <span style={{ fontSize: 32, fontWeight: 700, color: '#111', fontFamily: 'Arial, sans-serif', lineHeight: 1 }}>
                {avgRating}
              </span>
              <span style={{ fontSize: 14, color: '#888', fontFamily: 'Arial, sans-serif' }}>/ 5.0 overall rating</span>
              {profile.evaluations && profile.evaluations.length > 0 && (
                <span style={{ fontSize: 12, color: '#aaa', fontFamily: 'Arial, sans-serif', marginLeft: 4 }}>
                  ({profile.evaluations.length} evaluation{profile.evaluations.length !== 1 ? 's' : ''})
                </span>
              )}
            </div>
            {latestFeedback && (
              <blockquote
                style={{
                  margin: '12px 0 0',
                  padding: '10px 16px',
                  borderLeft: '3px solid #5e6ad2',
                  color: '#444',
                  fontSize: 13,
                  fontStyle: 'italic',
                  background: '#f9f9ff',
                  borderRadius: '0 4px 4px 0',
                  fontFamily: 'Georgia, serif',
                }}
              >
                "{latestFeedback}"
              </blockquote>
            )}
          </div>
        )}

        {/* Notes */}
        {profile.notes && (
          <div style={{ marginBottom: 28 }}>
            <SectionTitle>Notes</SectionTitle>
            <p
              style={{
                fontSize: 13,
                color: '#444',
                lineHeight: 1.6,
                margin: 0,
                fontFamily: 'Georgia, serif',
                whiteSpace: 'pre-wrap',
              }}
            >
              {profile.notes}
            </p>
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            marginTop: 40,
            paddingTop: 16,
            borderTop: '1px solid #e0e0e0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 11, color: '#aaa', fontFamily: 'Arial, sans-serif' }}>
            Generated by Talent Intelligence Hub · tih.app
          </span>
          <span style={{ fontSize: 11, color: '#aaa', fontFamily: 'Arial, sans-serif' }}>
            {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>
      </div>
    </>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: '#888',
        marginBottom: 12,
        fontFamily: 'Arial, sans-serif',
      }}
    >
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 12, color: '#888', fontFamily: 'Arial, sans-serif', minWidth: 100, flexShrink: 0 }}>
        {label}
      </span>
      <span style={{ fontSize: 12, color: '#222', fontFamily: 'Arial, sans-serif', wordBreak: 'break-all' }}>
        {value}
      </span>
    </div>
  )
}
