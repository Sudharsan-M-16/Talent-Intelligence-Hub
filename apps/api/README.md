# TIH API (apps/api)

Ingestion endpoint (MVP+):
- POST /api/v1/profiles/webhook

Planned:
- Payload validation
- Duplicate detection by email/phone/link
- Tenant-aware profile creation
- Store unmapped fields in raw_metadata (JSONB)
