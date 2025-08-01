# 🔒 Security Configuration Guide

## URGENT: Credential Security Alert

If you received a GitGuardian alert about exposed credentials, follow these steps immediately:

### 1. Rotate Your Credentials

**Gmail App Password:**
1. Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
2. Delete the existing app password for this application
3. Generate a new 16-character app password
4. Update your local `.env` file with the new password

**API Keys:**
- If using SendGrid, generate a new API key
- If using other SMTP providers, regenerate credentials

### 2. Environment Variables Setup

Create a `.env` file in the project root (this file is gitignored):

```bash
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-new-app-password

# Security
JWT_SECRET=generate-a-very-long-random-string-here
API_KEY=your-secure-api-key

# Features
ENABLE_SWAGGER=false  # Disable in production
ENABLE_RATE_LIMITING=true
ENABLE_BULK_EMAIL=true
```

### 3. Never Commit These Files

The following files should NEVER be committed to Git:
- `.env`
- `gmail-config.json`
- `*-config.json` (any config files with credentials)
- `secrets.json`
- Any file containing passwords, API keys, or tokens

### 4. Use Configuration Templates

Use the provided template files:
- `gmail-config.example.json` (template for Gmail config)
- `.env.example` (template for environment variables)

Copy these files and remove `.example` from the name, then add your real credentials.

### 5. Production Security

For production deployments:
- Use environment variables instead of config files
- Use secrets management (AWS Secrets Manager, Azure Key Vault, etc.)
- Enable encryption at rest and in transit
- Use strong, unique passwords
- Enable 2FA on all accounts

### 6. Git History Cleanup

If credentials were committed to Git history, clean them:

```bash
# Remove from Git history (WARNING: This rewrites history)
git filter-repo --invert-paths --path gmail-config.json
git filter-repo --invert-paths --path real-test-email.json

# Force push (if working alone)
git push origin --force --all
```

⚠️ **WARNING:** Only force push if you're the only one working on the repository!

### 7. Security Best Practices

1. **Never hardcode credentials** in source code
2. **Use environment variables** for all sensitive data
3. **Rotate credentials regularly** (every 90 days)
4. **Use different credentials** for development/production
5. **Monitor for exposed secrets** with tools like GitGuardian
6. **Use .env files** and ensure they're in .gitignore
7. **Review commits** before pushing to catch accidental exposures

### 8. Emergency Response

If credentials are exposed:
1. **Immediately rotate/revoke** the exposed credentials
2. **Remove from Git history** if committed
3. **Check access logs** for unauthorized usage
4. **Update all systems** using those credentials
5. **Document the incident** for security review

### 9. Monitoring

Set up monitoring for:
- Unauthorized email sending
- Failed authentication attempts
- Unusual access patterns
- Resource usage spikes

### 10. Contact Information

If you need help with security issues:
- Create an issue in the repository
- Check the troubleshooting documentation
- Review the deployment security guides

## Quick Security Checklist

- [ ] Rotated exposed credentials
- [ ] Created `.env` file with new credentials
- [ ] Verified `.env` is in `.gitignore`
- [ ] Removed sensitive files from Git tracking
- [ ] Updated all systems with new credentials
- [ ] Enabled monitoring and alerts
- [ ] Documented the incident

Remember: Security is not optional. Always err on the side of caution when handling credentials.
