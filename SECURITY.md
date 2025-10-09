# Security Policy

## Reporting a Vulnerability

We take the security of Graphora seriously. If you discover a security vulnerability, please follow these steps:

### 1. Do Not Open a Public Issue

Please **do not** report security vulnerabilities through public GitHub issues, discussions, or pull requests.

### 2. Report Privately

Send your vulnerability report to: **support@graphora.io**

Include the following information:
- Type of vulnerability
- Full paths of source files related to the vulnerability
- Location of the affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the vulnerability
- Any potential mitigations you've identified

### 3. What to Expect

- **Acknowledgment**: We'll acknowledge receipt within 48 hours
- **Updates**: We'll keep you informed about our progress
- **Timeline**: We aim to provide an initial assessment within 7 days
- **Fix**: Critical issues will be addressed immediately; others within 30 days
- **Disclosure**: We'll coordinate with you on public disclosure timing

### 4. Responsible Disclosure

We request that you:
- Allow us reasonable time to fix the vulnerability before public disclosure
- Avoid exploiting the vulnerability or sharing it with others
- Do not access, modify, or delete data that isn't yours
- Act in good faith and avoid privacy violations

### 5. Recognition

If you responsibly disclose a security issue:
- We'll acknowledge you in our security advisory (unless you prefer to remain anonymous)
- We may offer a bounty for critical vulnerabilities (case-by-case basis)

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| main    | :white_check_mark: |
| < 1.0   | :x:                |

We currently support only the latest version. Security fixes will be backported on a case-by-case basis for critical issues.

## Security Best Practices

When deploying Graphora Frontend:

### Authentication
- Use strong authentication (Clerk is configured by default)
- Rotate API keys regularly
- Use environment variables for all secrets
- Never commit `.env` files

### Network Security
- Use HTTPS in production
- Configure CORS properly
- Implement rate limiting
- Use secure headers (CSP, HSTS, etc.)

### Dependencies
- Regularly update dependencies
- Monitor for security advisories
- Use `npm audit` to check for vulnerabilities
- Review dependency licenses

### Data Protection
- Sanitize user inputs
- Use parameterized queries
- Implement proper access controls
- Encrypt sensitive data at rest

### Deployment
- Use secure CI/CD pipelines
- Scan container images for vulnerabilities
- Follow principle of least privilege
- Enable logging and monitoring

## Known Security Considerations

### Client-Side Rendering
- User data is processed client-side
- Ensure sensitive data is not exposed in browser storage
- Validate all inputs before sending to backend

### API Keys
- Never expose API keys in client-side code
- Use server-side API routes for sensitive operations
- Rotate keys if compromised

### Neo4j Integration
- Use read-only connections where possible
- Sanitize Cypher queries to prevent injection
- Implement query timeouts

## Security Updates

Security updates will be announced through:
- GitHub Security Advisories
- Release notes
- Email to registered users (if applicable)

## Contact

- **Security Issues**: support@graphora.io
- **General Questions**: See [SUPPORT.md](SUPPORT.md)

---

**Thank you for helping keep Graphora secure!**
