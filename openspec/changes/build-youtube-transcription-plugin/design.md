# Design Document: build-youtube-transcription-plugin

## Overview

This document outlines the architectural decisions, patterns, and trade-offs for the YouTube Whisper Transcription plugin for Obsidian.

## Architecture

### High-Level Components

```
┌─────────────────────────────────────────────────────────────┐
│                         Plugin Main                          │
│                  (Lifecycle, Commands)                       │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┬─────────────────┐
        │                         │                 │
┌───────▼────────┐    ┌──────────▼─────────┐   ┌──▼────────┐
│   Settings     │    │   Transcription    │   │    UI     │
│   Manager      │    │   Orchestrator     │   │ Components│
└────────────────┘    └────────┬───────────┘   └───────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
     ┌────────▼──────┐  ┌─────▼──────┐  ┌─────▼────────┐
     │   YouTube     │  │  Whisper   │  │Transcription │
     │   Service     │  │  Service   │  │   Storage    │
     └───────────────┘  └────────────┘  └──────────────┘
```

### Module Structure

```
src/
├── main.ts                    # Plugin entry point, lifecycle
├── settings.ts                # Settings interface and defaults
├── types.ts                   # Shared TypeScript types
├── commands/
│   └── transcribe-command.ts  # Main transcription command
├── services/
│   ├── youtube-service.ts     # YouTube integration (metadata, audio, captions)
│   ├── whisper-service.ts     # OpenAI Whisper API integration
│   ├── audio-processor.ts     # Audio chunking and processing
│   └── transcription-orchestrator.ts  # Coordinates transcription workflow
├── storage/
│   ├── transcription-storage.ts   # Save/retrieve transcriptions
│   └── temp-file-manager.ts       # Temporary file lifecycle
├── ui/
│   ├── progress-modal.ts      # Progress display during transcription
│   ├── comparison-view.ts     # Side-by-side comparison
│   └── settings-tab.ts        # Plugin settings UI
└── utils/
    ├── youtube-url-parser.ts  # Parse and validate YouTube URLs
    ├── markdown-formatter.ts  # Format transcriptions as Markdown
    └── error-handler.ts       # Centralized error handling
```

## Key Design Decisions

### 1. Audio Extraction Strategy

**Decision:** Use YouTube.js (youtubei.js) - a wrapper around YouTube's InnerTube API.

**Rationale:**
- **Actively maintained**: v16.0.1 (October 2025), 14.4k projects using it
- **No API keys required**: Uses YouTube's private InnerTube API (same API YouTube clients use)
- **Full-featured**: Supports video/audio download, metadata, captions/transcripts
- **Cross-platform**: Works on Node.js, Deno, and browsers
- **Type-safe**: Written in TypeScript
- **No external binaries**: Pure JavaScript solution

**Trade-offs:**
- Uses unofficial/private API (subject to YouTube changes)
- Larger bundle size than simpler libraries
- May need updates if YouTube modifies InnerTube

**Mitigation:**
- **Vendor critical dependencies** in repo (see dependency strategy below)
- Implement robust error handling for API changes
- Monitor YouTube.js releases and community for breaking changes
- Provide clear error messages if YouTube blocks requests
- Archive working versions of YouTube.js in repo for long-term resilience

**Why NOT ytdl-core or @distube/ytdl-core:**
- Original ytdl-core: paused since 2023
- @distube/ytdl-core: archived August 16th, 2025
- Both recommend migrating to YouTube.js or play-dl
- YouTube.js is the most comprehensive successor

### 2. Whisper Integration Approach

**Decision:** Use OpenAI Whisper API instead of local Whisper binary or Transformers.js.

**Rationale:**
- Best transcription quality
- No local installation required (besides API key)
- Handles multiple languages well
- Fast processing (server-side GPUs)
- Simpler implementation

**Trade-offs:**
- Requires network connection
- Costs money (API credits)
- Uploads audio to OpenAI servers (privacy consideration)
- 25MB file size limit per request

**Mitigation:**
- Clear documentation about API costs and privacy
- Implement chunking for large files
- Show estimated cost before transcription
- Cache transcriptions to avoid re-processing
- Future: Add option for AWS Lambda endpoint (user-controlled)

### 3. Audio Chunking Strategy

**Problem:** Whisper API has 25MB file size limit, but videos can be 8+ hours (large audio files).

**Solution:** Chunk audio files exceeding limit.

**Implementation:**
```
1. Download audio in chunks directly from YouTube (use ytdl-core's range support)
2. Check total file size from metadata
3. If > 25MB:
   a. Download audio in time-based segments (e.g., 10-15 min segments)
   b. Save each segment to temp directory
   c. Send each segment to Whisper API sequentially
   d. Merge transcriptions preserving timestamps
4. Clean up temp files
```

**Considerations:**
- Chunk size: Target ~10-15 minute segments (typically 15-20MB depending on quality)
- Use ytdl-core's `begin` and `end` parameters for range requests
- No external binary dependencies - pure Node.js/JavaScript solution
- Error handling: If one chunk fails, retry 3 times before failing entire transcription
- Progress tracking: Update progress per chunk (chunk 3/10 - 65%)

**Libraries:**
- YouTube.js (supports streaming and partial downloads)
- Built-in Node.js fs/stream APIs for file handling

**Decision:** Use YouTube.js with time-based segment downloads
- **Works on all platforms** (Windows, Mac, Linux) without external binaries
- **Simpler installation** for end users (just install plugin)
- **Timestamp preservation** handled by downloading at specific time offsets
- **Download API**: Use `video.download()` method with range parameters
- **Format selection**: Choose audio-only formats (opus, m4a) to minimize bandwidth
- Trade-off: Less precise chunking than ffmpeg, but acceptable for transcription use case

**YouTube.js Download Approach:**
```typescript
// Get video info
const video = await innertube.getInfo(videoId);

// For large videos, download in segments
const audioDuration = video.basic_info.duration;
const segmentDuration = 900; // 15 minutes in seconds

for (let start = 0; start < audioDuration; start += segmentDuration) {
  const end = Math.min(start + segmentDuration, audioDuration);
  // Download segment (YouTube.js handles range requests internally)
  const stream = await video.download({
    type: 'audio',
    quality: 'best',
    // Range will be handled by selecting appropriate formats
  });
  // Save segment to temp file
}
```

### 4. Storage Location Flexibility

**Decision:** Support three storage modes with user preference.

**Modes:**
1. **Dedicated folder** (e.g., "Transcriptions/")
   - Pro: Organized, easy to find all transcriptions
   - Con: Separated from related notes
   - Default: "Transcriptions/" in vault root

2. **Same folder as active note**
   - Pro: Keeps transcription near related content
   - Con: Can clutter folder
   - Use case: Research notes with sources

3. **Insert into active note**
   - Pro: Immediate inline content
   - Con: Can create very long notes
   - Use case: Quick append to existing notes

**Implementation:**
- Setting: dropdown with three options
- Command: optionally override setting (ask user per transcription)
- File naming: `{video-title}-transcript-{method}.md`
  - `{method}`: "whisper", "youtube", or "comparison"

### 5. Language Detection

**Requirement:** Use original video language, not auto-translated captions.

**Implementation:**
```
1. Fetch video metadata via YouTube API or library
2. Check available caption tracks
3. Filter for tracks with kind="asr" or kind="" (auto-generated or manual)
4. Filter for language matching video's defaultLanguage metadata
5. Reject tracks with kind="automatic_translation"
6. For Whisper: pass detected language as hint (optional, improves accuracy)
```

**Edge cases:**
- No original language captions available: Proceed with Whisper only
- Multiple caption tracks in same language: Prefer manual over auto-generated
- Language detection fails: Ask user to specify language

### 6. Transcription Comparison View

**Decision:** Simple side-by-side comparison without complex diff algorithm.

**Rationale:**
- User requested "not like git diff"
- Primary use case: Quality assessment, not line-by-line comparison
- Simpler implementation

**Implementation:**
- Two-panel layout (Obsidian's split view)
- Left panel: Whisper transcription
- Right panel: YouTube transcription
- Synchronized scrolling (optional toggle)
- Markdown rendering in both panels
- Export both to single file with clear sections

**Future enhancements:**
- Basic word highlighting for differences (optional)
- Timestamp alignment for easier comparison

### 7. Error Handling Strategy

**Principles:**
- User-friendly messages in UI
- Detailed logs in console (for troubleshooting)
- Graceful degradation where possible
- Actionable guidance

**Error Categories:**
1. **User configuration errors** (invalid API key, missing settings)
   - Show: Clear message with link to settings
   - Action: Open settings tab

2. **Network errors** (download failed, API timeout)
   - Show: Retry option, check connection message
   - Action: Retry with exponential backoff

3. **API errors** (quota exceeded, invalid request)
   - Show: Specific API error message
   - Action: Guide user to OpenAI dashboard

4. **File system errors** (permissions, disk space)
   - Show: File path and permission issue
   - Action: Suggest alternative location

5. **Processing errors** (audio extraction failed, chunking failed)
   - Show: Step where failure occurred
   - Action: Provide alternative (e.g., manual audio upload in future)

**Error UI:**
```typescript
interface TranscriptionError {
  category: 'config' | 'network' | 'api' | 'filesystem' | 'processing';
  message: string;  // User-friendly
  detail: string;   // Technical detail for console
  action?: {
    label: string;  // e.g., "Open Settings"
    callback: () => void;
  };
}
```

### 8. Progress Tracking

**Requirements:**
- Show current step
- Show overall progress percentage
- Show estimated time remaining
- Allow cancellation

**Implementation:**
```typescript
interface TranscriptionProgress {
  step: 'downloading' | 'extracting' | 'chunking' | 'transcribing' | 'saving';
  stepProgress: number;  // 0-100 for current step
  overallProgress: number;  // 0-100 for entire process
  currentChunk?: number;
  totalChunks?: number;
  estimatedTimeRemaining?: number;  // seconds
  cancellable: boolean;
}
```

**Progress Modal:**
- Step indicator: "Downloading audio... (1/5)"
- Progress bar for current step
- Overall progress bar
- Time estimate: "About 3 minutes remaining"
- Cancel button (when cancellable)

**Time estimation:**
- Base estimates per step (download: 10s/min of video, transcribe: 5s/min of audio)
- Update estimates based on actual performance
- Show range for uncertainty ("2-4 minutes remaining")

### 9. Security and Privacy Considerations

**API Key Storage:**
- Store in Obsidian's plugin data (encrypted by Obsidian)
- Never log API key to console
- Validate key format before sending to API
- Clear guidance on obtaining API key from OpenAI

**Data Privacy:**
- Document in README that audio is sent to OpenAI for Whisper transcription
- Document that YouTube downloads go through YouTube's servers
- No telemetry or data collection by plugin
- Option to use only YouTube transcriptions (no API call)

**Input Sanitization:**
- Validate all YouTube URLs (prevent code injection)
- Sanitize video titles for filenames (prevent path traversal)
- Validate file paths before writing

### 10. Performance Optimizations

**Caching:**
- Cache video metadata for 1 hour (reduce YouTube API calls)
- Cache downloaded transcriptions (avoid re-fetching)
- Don't cache audio files (too large)

**Lazy Loading:**
- Don't initialize Whisper service until first use
- Don't load comparison view until requested

**Resource Management:**
- Limit concurrent transcriptions to 1 (avoid overwhelming system)
- Clean up temp files immediately after use
- Cancel in-progress downloads if command cancelled

**Bundle Size:**
- Use tree-shaking to minimize dependencies
- Lazy load heavy modules (ffmpeg wrapper only when needed)
- Target <500KB total bundle size

## Technology Choices

### Dependencies

**Required:**
- `openai` (^4.x) - OpenAI API client
- `youtubei.js` (^16.x) - YouTube InnerTube API client

**Optional:**
- `node-cache` - Simple in-memory caching for metadata

**Dev Dependencies:**
- Existing from sample plugin (TypeScript, esbuild, etc.)

### External Requirements

**User must install:**
- None! Plugin works out of the box after installation

**User must provide:**
- OpenAI API key
  - Link to OpenAI platform in settings
  - Show cost estimation guidance

## Dependency Resilience Strategy

### Problem
Third-party npm packages can be:
- Archived or abandoned (e.g., @distube/ytdl-core archived Aug 2025)
- Removed from npm registry
- Taken over by malicious actors
- Subject to breaking changes

### Solution: Dependency Vendoring

**Approach:**
1. **Vendor critical dependencies** - Keep copies of essential libraries in repo
2. **Lock working versions** - Use exact versions in package.json
3. **Archive dependency code** - Commit working versions to a `vendor/` directory

**Critical Dependencies to Vendor:**
- `youtubei.js` - Core YouTube functionality (most likely to break if YouTube changes API)

**Standard Dependencies (use normal npm):**
- `openai` - Stable, well-maintained by OpenAI
- `node-cache` - Simple, stable utility library

**Implementation:**
```
project/
├── vendor/                     # Vendored dependencies (committed to git)
│   └── youtubei.js/           # Archived working version
│       ├── package.json
│       ├── dist/
│       └── LICENSE
├── src/
│   └── services/
│       └── youtube-service.ts  # Use vendored or npm version
├── package.json                # References npm version by default
└── README.md                   # Document how to switch to vendored version
```

**Package.json Strategy:**
```json
{
  "dependencies": {
    "youtubei.js": "16.0.1",  // Exact version, not ^16.0.1
    "openai": "^4.0.0"
  },
  "devDependencies": {
    "youtubei.js-vendor": "file:./vendor/youtubei.js"  // Optional fallback
  }
}
```

**Usage Pattern:**
```typescript
// src/services/youtube-service.ts
// Try npm version first, fallback to vendored if needed
let Innertube;
try {
  // Use npm version
  Innertube = require('youtubei.js').Innertube;
} catch (err) {
  // Fallback to vendored version
  Innertube = require('../../vendor/youtubei.js/dist').Innertube;
}
```

**Benefits:**
- ✅ Plugin continues working even if npm package is removed
- ✅ Can update to newer versions when stable
- ✅ Full control over critical dependencies
- ✅ Users don't need to do anything special

**Trade-offs:**
- Larger git repo size (~1-2 MB for YouTube.js)
- Need to manually update vendored versions
- More maintenance overhead

**Documentation Requirements:**
- README: Document vendored dependencies and why
- README: Instructions for updating vendored versions
- CONTRIBUTING: Guide for testing with both npm and vendored versions

### Alternative: Custom YouTube Integration

**Feasibility of Building Custom Functions:**

Instead of depending on YouTube.js, we could build minimal custom functions for our specific needs:

**Required Functionality:**
1. Extract video ID from URL ✅ (trivial - regex)
2. Get video metadata (title, duration, language) ⚠️ (moderate - requires InnerTube API knowledge)
3. Get available formats/streams ⚠️ (moderate - InnerTube response parsing)
4. Download audio stream ⚠️ (moderate - handle adaptive streams)
5. Get captions/transcripts ⚠️ (moderate - caption API)

**Effort Assessment:**
- **Low effort (1-2 days)**: URL parsing, basic metadata extraction
- **Medium effort (3-5 days)**: Format selection, stream downloading
- **High effort (1-2 weeks)**: Handle all YouTube edge cases, signature decoding, throttling

**Recommendation: Use YouTube.js + Vendor**
- YouTube.js handles complex cases (signature decoding, format selection, rate limiting)
- Building custom would take weeks and be fragile
- InnerTube API is undocumented and changes frequently
- YouTube.js community provides quick fixes when YouTube changes API
- Vendoring provides resilience without reinventing the wheel

**Future Consideration:**
- If YouTube.js becomes unmaintained, *then* consider extracting minimal required functionality
- For now, vendor working version and monitor project health

### Automated Vendor Dependency Updates

**Problem:**
Vendored dependencies can become outdated, missing security fixes and new features.

**Solution:**
Automated update script + GitHub workflow to keep vendored dependencies current.

**Update Script (`scripts/update-vendor-deps.js`):**
```javascript
#!/usr/bin/env node
/**
 * Updates vendored dependencies to latest compatible versions
 * Usage:
 *   node scripts/update-vendor-deps.js               # Check all
 *   node scripts/update-vendor-deps.js youtubei.js   # Update specific
 *   node scripts/update-vendor-deps.js --check-only  # Don't update, just report
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const VENDOR_DIR = path.join(__dirname, '..', 'vendor');
const VENDORED_DEPS = [
  {
    name: 'youtubei.js',
    npmPackage: 'youtubei.js',
    files: ['package.json', 'dist/', 'LICENSE', 'README.md']
  }
];

async function checkLatestVersion(packageName) {
  const result = execSync(`npm view ${packageName} version`, { encoding: 'utf8' });
  return result.trim();
}

async function getCurrentVendoredVersion(depName) {
  const pkgPath = path.join(VENDOR_DIR, depName, 'package.json');
  if (!fs.existsSync(pkgPath)) return null;
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  return pkg.version;
}

async function updateVendoredDep(dep, targetVersion) {
  const tmpDir = path.join(__dirname, '..', '.tmp-vendor');

  // Download to temp directory
  execSync(`npm pack ${dep.npmPackage}@${targetVersion}`, { cwd: tmpDir });

  // Extract tarball
  const tarball = `${dep.npmPackage.replace('/', '-')}-${targetVersion}.tgz`;
  execSync(`tar -xzf ${tarball}`, { cwd: tmpDir });

  // Copy only needed files
  const srcDir = path.join(tmpDir, 'package');
  const destDir = path.join(VENDOR_DIR, dep.name);

  fs.rmSync(destDir, { recursive: true, force: true });
  fs.mkdirSync(destDir, { recursive: true });

  for (const file of dep.files) {
    const src = path.join(srcDir, file);
    const dest = path.join(destDir, file);

    if (file.endsWith('/')) {
      fs.cpSync(src, dest, { recursive: true });
    } else {
      fs.copyFileSync(src, dest);
    }
  }

  // Clean up temp directory
  fs.rmSync(tmpDir, { recursive: true, force: true });

  // Git commit
  const commitMsg = `chore: update vendored ${dep.name} to ${targetVersion}`;
  execSync(`git add vendor/${dep.name}`);
  execSync(`git commit -m "${commitMsg}"`);

  console.log(`✅ Updated ${dep.name} to ${targetVersion}`);
}

async function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes('--check-only');
  const specificDep = args.find(arg => !arg.startsWith('--'));

  const depsToCheck = specificDep
    ? VENDORED_DEPS.filter(d => d.name === specificDep)
    : VENDORED_DEPS;

  for (const dep of depsToCheck) {
    const current = await getCurrentVendoredVersion(dep.name);
    const latest = await checkLatestVersion(dep.npmPackage);

    console.log(`${dep.name}: ${current || 'not vendored'} -> ${latest}`);

    if (current !== latest && !checkOnly) {
      await updateVendoredDep(dep, latest);
    }
  }
}

main().catch(console.error);
```

**GitHub Workflow (`.github/workflows/update-vendor-deps.yml`):**
```yaml
name: Update Vendored Dependencies

on:
  # NOTE: Scheduled workflows have limitations:
  # - Only run on default branch
  # - Don't run in forks
  # - Stop after 60 days of inactivity
  # Use manual dispatch or PR checks instead for reliability

  # Allow manual trigger (RECOMMENDED)
  workflow_dispatch:
    inputs:
      package:
        description: 'Specific package to update (or leave empty for all)'
        required: false
        type: string

  # Check on PRs (comment only, don't auto-commit)
  pull_request:
    branches: [ master, main ]

  # Optional: Run on push to main (as backup for schedule)
  push:
    branches: [ master, main ]
    paths:
      - 'package.json'
      - '.github/workflows/update-vendor-deps.yml'

jobs:
  check-vendor-updates:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for commits

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Install dependencies
        run: npm ci

      - name: Check for vendor updates
        id: check
        run: |
          node scripts/update-vendor-deps.js --check-only > vendor-check.txt
          echo "result<<EOF" >> $GITHUB_OUTPUT
          cat vendor-check.txt >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT

      # On PRs: Comment if outdated
      - name: Comment on PR if outdated
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const output = `${{ steps.check.outputs.result }}`;
            if (output.includes('->')) {
              github.rest.issues.createComment({
                issue_number: context.issue.number,
                owner: context.repo.owner,
                repo: context.repo.repo,
                body: `## Vendored Dependency Updates Available\n\n\`\`\`\n${output}\n\`\`\`\n\nRun \`npm run update-vendor-deps\` to update.`
              });
            }

      # On manual trigger or push: Check and report (don't auto-commit to main)
      - name: Update vendored dependencies (check mode)
        if: github.event_name == 'workflow_dispatch' || github.event_name == 'push'
        run: |
          # Only check, don't update yet
          node scripts/update-vendor-deps.js --check-only > vendor-status.txt
          cat vendor-status.txt

          # Create issue if updates available (manual workflow only)
          if [ "${{ github.event_name }}" == "workflow_dispatch" ]; then
            if grep -q "->" vendor-status.txt; then
              echo "Updates available - creating issue"
              echo "UPDATES_AVAILABLE=true" >> $GITHUB_ENV
            else
              echo "No updates needed"
            fi
          fi

      - name: Create issue for updates
        if: env.UPDATES_AVAILABLE == 'true' && github.event_name == 'workflow_dispatch'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const status = fs.readFileSync('vendor-status.txt', 'utf8');

            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: '🔄 Vendored Dependencies Updates Available',
              body: `## Updates Available\n\n\`\`\`\n${status}\n\`\`\`\n\n### To Update\n\nRun locally:\n\`\`\`bash\nnpm run update-vendor-deps\ngit push\n\`\`\`\n\nOr manually trigger this workflow to create a PR.`,
              labels: ['dependencies', 'maintenance']
            });
```

**Package.json Scripts:**
```json
{
  "scripts": {
    "update-vendor-deps": "node scripts/update-vendor-deps.js",
    "update-vendor-deps:check": "node scripts/update-vendor-deps.js --check-only",
    "update-vendor-deps:youtubei": "node scripts/update-vendor-deps.js youtubei.js"
  }
}
```

**Benefits:**
- ✅ **Automatic monitoring**: Weekly checks for updates
- ✅ **PR notifications**: Developers see when deps are outdated
- ✅ **Manual control**: Can trigger updates on demand
- ✅ **Audit trail**: Each update is a separate commit with version info
- ✅ **Safe**: Creates PRs for review, not direct commits to main

**Workflow Behavior:**

1. **On Pull Request** (Primary Method):
   - Checks vendored deps
   - Comments on PR if outdated (doesn't auto-update)
   - Developer can run `npm run update-vendor-deps` locally if needed

2. **On Manual Dispatch** (Recommended for Updates):
   - Checks for updates
   - Creates GitHub issue with update instructions
   - Developer manually runs update script and pushes

3. **On Push to Main** (Passive Monitoring):
   - Checks vendored deps when package.json changes
   - Logs status, doesn't auto-commit

**Why No Auto-Commit:**
- ✅ Prevents unexpected changes to main branch
- ✅ Allows manual testing before committing updates
- ✅ Avoids GitHub Actions limitations with scheduled workflows
- ✅ More control over dependency updates

**Alternative: Dependabot-style PRs**

For truly automated updates, add a separate workflow that creates PRs:

```yaml
# .github/workflows/auto-update-vendor-deps.yml
name: Auto Update Vendored Dependencies

on:
  workflow_dispatch:  # Manual trigger only

jobs:
  update-and-pr:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Update dependencies
        run: |
          npm ci
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"

          # Create branch
          BRANCH="auto-vendor-update-$(date +%Y%m%d-%H%M%S)"
          git checkout -b "$BRANCH"

          # Run update
          node scripts/update-vendor-deps.js

          # Push if changes
          if ! git diff --quiet vendor/; then
            git add vendor/
            git commit -m "chore: update vendored dependencies [automated]"
            git push origin "$BRANCH"

            # Create PR
            gh pr create \
              --title "chore: update vendored dependencies" \
              --body "Automated update of vendored dependencies. Please review changes before merging." \
              --label "dependencies"
          fi
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Recommended Workflow:**
1. Monthly: Manually trigger "Auto Update Vendored Dependencies" workflow
2. Review automated PR
3. Merge if tests pass
4. PRs automatically check and notify about outdated deps

**Security Considerations:**
- Script only downloads from npm registry (same as `npm install`)
- Git commits are attributed to github-actions[bot]
- PRs require review before merging
- Can pin to specific versions if needed (don't auto-update)

## Testing Strategy

### Manual Testing Scenarios

1. **Short video (5 min):**
   - Test basic Whisper transcription
   - Test YouTube transcription
   - Test comparison view
   - Expected: Fast, simple workflow

2. **Medium video (1 hour):**
   - Test chunking threshold
   - Test progress tracking
   - Expected: Chunking works, progress accurate

3. **Long video (4+ hours):**
   - Test large file handling
   - Test error recovery mid-transcription
   - Expected: Completes within reasonable time, handles errors

4. **Different languages:**
   - Test English, Spanish, German, etc.
   - Verify original language detection
   - Expected: Correct language used, no auto-translation

5. **Edge cases:**
   - Invalid YouTube URL
   - Invalid API key
   - No internet connection
   - Video with no captions
   - Cancelled mid-process
   - Expected: Graceful errors, proper cleanup

### Automated Testing (Future)

- Unit tests for URL parsing
- Unit tests for Markdown formatting
- Mock tests for API interactions
- Integration tests with sample audio files

## Future Enhancements

1. **AWS Lambda endpoint** (mentioned by user)
   - User deploys own Lambda function
   - Plugin sends audio to Lambda instead of OpenAI
   - More control, potentially lower cost

2. **Batch transcription**
   - Queue multiple videos
   - Process overnight

3. **Transcription editing**
   - Inline corrections
   - Timestamp adjustment
   - Re-export

4. **Audio player integration**
   - Link transcription to Obsidian audio player
   - Click timestamp to jump to position

5. **Cost tracking**
   - Estimate costs before transcription
   - Track total API spend

6. **Playlist support**
   - Transcribe entire YouTube playlists
   - Organize as linked notes

## Open Questions

1. Should we support other video platforms (Vimeo, etc.)?
   - Decision: No, focus on YouTube for initial release

2. Should we store raw audio files in vault for re-processing?
   - Decision: No, too large. Download fresh if needed.

3. Should we support subtitle file formats (SRT, VTT)?
   - Decision: Future enhancement, start with Markdown only

4. Should we support multiple API providers (AssemblyAI, Deepgram)?
   - Decision: Future enhancement, start with OpenAI Whisper
