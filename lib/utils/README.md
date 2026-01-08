# Utilities Directory Structure

This directory contains utility functions organized by **render context** (where the code can run) and **subject area** (what domain it handles).

## Structure Overview

```
lib/utils/
├── client/          # Browser-only utilities (use browser APIs)
├── server/          # Node.js-only utilities (use Node.js APIs)
├── shared/          # Platform-agnostic utilities (pure JS/TS)
└── app/             # Application-specific utilities (mixed - legacy)
```

## Directory Descriptions

### `client/` - Browser-Only Utilities

Utilities that **require browser APIs** and cannot run on the server.

| Subdirectory | Purpose                                            |
| ------------ | -------------------------------------------------- |
| `audio/`     | Client-side audio processing (FFmpeg.wasm)         |
| `device/`    | Device detection via user agent                    |
| `file/`      | Client-side file validation using browser File API |

**Key indicator**: Uses `File`, `Blob`, `navigator`, `window`, or browser-specific libraries like `@ffmpeg/ffmpeg`.

### `server/` - Node.js-Only Utilities

Utilities that **require Node.js APIs** and cannot run in the browser.

| Subdirectory | Purpose                                               |
| ------------ | ----------------------------------------------------- |
| `api/`       | Next.js API response helpers                          |
| `audio/`     | Server-side audio extraction (ffmpeg-static)          |
| `blob/`      | Azure Blob Storage operations                         |
| `chat/`      | Server-side chat message processing                   |
| `file/`      | File handling, validation, MIME types, PDF processing |
| `log/`       | Log sanitization for security                         |
| `tiktoken/`  | Token counting with tiktoken                          |

**Key indicator**: Uses `fs`, `path`, `Buffer`, `crypto`, `child_process`, or Node.js-specific libraries.

### `shared/` - Platform-Agnostic Utilities

Utilities that are **pure JavaScript/TypeScript** and can run anywhere.

| Subdirectory | Purpose                                                       |
| ------------ | ------------------------------------------------------------- |
| `audio/`     | Audio time formatting                                         |
| `chat/`      | Message parsing, validation, versioning, variables            |
| `document/`  | Document conversion, sanitization (uses isomorphic-dompurify) |

**Key indicator**: No Node.js or browser-specific APIs. Uses only standard JS/TS features or isomorphic libraries.

### `app/` - Application Utilities (Legacy)

Mixed utilities specific to the application. This directory contains a combination of client, server, and shared code that hasn't been reorganized yet.

> **Note**: This directory is scheduled for future refactoring to follow the same `client/server/shared` pattern.

## Adding New Utilities

When adding a new utility, ask yourself:

1. **Does it use browser-only APIs?** (File, Blob, navigator, window, etc.)
   → Place in `client/<subject>/`

2. **Does it use Node.js-only APIs?** (fs, path, Buffer, child_process, etc.)
   → Place in `server/<subject>/`

3. **Is it pure JS/TS with no platform dependencies?**
   → Place in `shared/<subject>/`

## Import Paths

Always use the `@/` path alias for imports:

```typescript
// Client utilities
import { extractAudio } from '@/lib/utils/client/audio/audioExtractor';
// Server utilities
import { successResponse } from '@/lib/utils/server/api/apiResponse';
// Shared utilities
import { formatTime } from '@/lib/utils/shared/audio/formatTime';
```

## Testing

Test files mirror this structure under `__tests__/lib/utils/`:

```
__tests__/lib/utils/
├── client/
├── server/
├── shared/
└── app/
```
