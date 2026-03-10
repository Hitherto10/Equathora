# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Equathora, **please do NOT open a public GitHub issue**.

Instead, report it privately:

1. Go to the **Security** tab of this repository
2. Click **"Report a vulnerability"** (GitHub Private Vulnerability Reporting)
3. Provide a clear description, reproduction steps, and any relevant details

We aim to acknowledge reports within **48 hours** and provide a fix or mitigation plan within **7 days**.

## What Counts as a Vulnerability

- Exposed secrets, API keys, or credentials in the repository
- Authentication or authorization bypasses
- SQL injection, XSS, or other injection attacks
- Access to other users' data
- Server-side request forgery (SSRF)
- Any issue that compromises user data or system integrity

## Security Practices

- All secrets are loaded from environment variables, never hardcoded
- `.env` and `appsettings.*.json` files are excluded from version control
- Database access is protected by Row Level Security (RLS) policies
- Authentication uses JWT with BCrypt password hashing
- Rate limiting is applied to authentication endpoints
- CORS is restricted to known origins

## For Contributors

- **Never commit** `.env`, `appsettings.json`, `appsettings.Development.json`, or `appsettings.Production.json` with real values
- Use the `.example` template files to set up your local environment
- Do not log or expose sensitive data (tokens, passwords, connection strings) in PRs
- If you accidentally commit a secret, notify the maintainer immediately so keys can be rotated
