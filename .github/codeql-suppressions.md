# CodeQL Security Alert Suppressions

This document explains why certain CodeQL alerts have been suppressed.

## Log Injection Warnings (js/log-injection)

**Status**: Mitigated
**Severity**: Medium
**Mitigation**: All affected log statements use `sanitizeForLog()` from `lib/utils/server/logSanitization.ts`

### Sanitization Details:

1. Uses `serialize-error` package for safe error serialization
2. Removes newlines (`\r\n`) that could inject fake log entries
3. Removes control characters (`\x00-\x1F`, `\x7F-\x9F`) including ANSI escape codes
4. Trims whitespace

### Affected Files:

- API routes: agent, audio, rag, standard, tool-aware, tones/analyze
- Services: AgentChatService, ChatOrchestrator, FileConversationHandler, StandardChatService, ragService
- Utils: ModelSelector, transcription/common, documentSummary

**Justification**: User-controlled data is sanitized before logging, preventing log injection attacks.

## Server-Side Request Forgery (js/ssrf)

**Status**: Mitigated
**Severity**: Critical
**Mitigation**: `lib/utils/app/image.ts` uses `private-ip` package validation

### SSRF Protection Details:

1. Validates URL format
2. Only allows HTTP/HTTPS protocols
3. Uses `private-ip` npm package to block:
   - Localhost (127.0.0.1, ::1)
   - Private IP ranges (10.x.x.x, 192.168.x.x, 172.16-31.x.x)
   - Link-local addresses (169.254.x.x, fe80::)
   - AWS metadata service (169.254.169.254)

**Justification**: URL is validated against private IP ranges before making any fetch requests, preventing SSRF attacks.

## Why Inline Suppressions?

CodeQL's static analysis cannot recognize custom sanitization functions. While our mitigations are effective, CodeQL's taint tracking doesn't see through our `sanitizeForLog()` wrapper.

The proper solution is inline suppression with justification rather than disabling rules globally.
