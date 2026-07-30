# Module: Edge Functions (Deno)

## 1. Why this concept exists
Certain backend operations must be isolated from the frontend for security (e.g., hiding API keys, acting as webhooks for third-party services). Supabase Edge Functions run globally via Deno, providing serverless compute without managing infrastructure.

## 2. Where this concept appears in THIS project
- `supabase/functions/profile-intake/index.ts`

## 3. Which files implement it
See above.

## 4. Which functions implement it
- `serve()` from Deno HTTP.
- `createClient()` from `@supabase/supabase-js`.

## 5. Complete execution flow
1. **Request**: An external service (e.g., a Zapier webhook or a career page) sends a POST request to `https://[ref].supabase.co/functions/v1/profile-intake`.
2. **CORS Handling**: The function intercepts `OPTIONS` requests to return standard CORS headers, allowing cross-origin calls.
3. **Payload Parsing**: Evaluates `req.json()` and validates required fields (`full_name`).
4. **Service Role**: Initializes the Supabase client using the `SERVICE_ROLE_KEY`. This bypasses Row Level Security (RLS) entirely.
5. **Database Mutation**: Uses `.upsert()` to insert the parsed JSON directly into `talent_profiles`.
6. **Response**: Returns the created database record with a 201 Created status.

## 6. Engineering decisions
- **Deno vs Node**: Supabase uses Deno for edge functions because Deno has a much faster cold-start time (v8 isolates) compared to Node.js Docker containers, allowing global deployment with milliseconds of latency.
- **Service Role Key**: Because a webhook might be unauthenticated (or authenticated via a custom header), RLS cannot rely on a standard JWT. The Service Role key allows the script total DB access, acting as a trusted admin agent.

## 7. Tradeoffs
- **Tradeoff**: Bypassing RLS with the Service Role key means any bug in the edge function could potentially corrupt data across any organization.
- **Mitigation**: The code strictly hardcodes `DEMO_ORG_ID` (or pulls from env) to ensure data is sandboxed to the correct tenant.

## 8. Alternatives
- Building a full Express.js/Nest.js server. Rejected because the infrastructure overhead is massive for a single intake webhook.

## 9. Common bugs
- **CORS Errors**: A browser tries to POST to the function, but the preflight fails.
- *Fix*: The Deno script must always explicitly handle `req.method === 'OPTIONS'` and return the allow headers.

## 10. Debugging techniques
- Use the Supabase Dashboard Edge Functions log viewer to see `console.log()` statements.

## 11. Security implications
- The endpoint is currently open to the internet. Anyone can POST to it and create profiles. In production, this function MUST validate a secret API key passed in the headers.

## 12. Performance implications
- Edge functions run close to the user geographically. Latency is typically < 50ms.

## 13. Scalability implications
- Scales infinitely and automatically. No server provisioning required.

## 14. Best practices
- Keep dependencies minimal. Use `esm.sh` to import specific versions of NPM packages into Deno.

## 15. Future improvements
- Add a header check: `if (req.headers.get('x-api-key') !== Deno.env.get('WEBHOOK_SECRET')) return 401`.

## 16. Interview questions
- *Q: Why does the function use the Service Role Key instead of the Anon Key?*
  A: Webhooks do not act on behalf of a specific logged-in user. RLS policies usually require `auth.uid()`. The Service Role key allows the function to bypass RLS to insert system-level data.

## 17. Practical exercises
- Send a cURL POST request to the local edge function to see a profile appear in the UI.

## 18. Mini implementation exercises
- Update the function to accept `linkedin_url` in the payload.

## 19. Reading checklist
- [ ] Read `profile-intake/index.ts`.

## 20. Completion checklist
- [ ] I understand what Deno is.
- [ ] I can write a CORS preflight handler.
