# Tasks for build-youtube-transcription-plugin

## Phase 1: Project Setup and Configuration

1. **Update plugin metadata**
   - Update manifest.json (id, name, description, set isDesktopOnly: true)
   - Update package.json (name, description, author)
   - Add OpenAI SDK dependency (`openai@^4.0.0`)
   - Add YouTube.js dependency (`youtubei.js@16.0.1` - exact version)
   - Validation: npm install succeeds, no dependency conflicts

1.5. **Vendor critical dependencies**
   - Create `vendor/` directory in project root
   - Download and commit youtubei.js@16.0.1 to `vendor/youtubei.js/`
   - Include package.json, dist/, and LICENSE
   - Update .gitignore to NOT ignore vendor/ directory
   - Document vendoring strategy in README.md
   - Validation: Plugin can load from vendored version if npm version unavailable

1.6. **Create vendor dependency update script**
   - Create `scripts/update-vendor-deps.sh` (or .js for cross-platform)
   - Script checks npm for newer versions of vendored dependencies
   - Downloads and extracts new versions to vendor/ directory
   - Preserves only necessary files (package.json, dist/, LICENSE, README.md)
   - Creates git commit with update details
   - Validation: Script successfully updates vendored dependency to specified version

1.7. **Create GitHub workflows for vendor dependency management**
   - Create `.github/workflows/update-vendor-deps.yml` (check and notify)
     - Triggers on: pull requests, manual dispatch, push to main
     - On PRs: Comments if vendored deps are outdated
     - On manual dispatch: Creates GitHub issue with update instructions
     - On push: Logs vendor dependency status
   - Create `.github/workflows/auto-update-vendor-deps.yml` (optional PR creation)
     - Triggers on: manual dispatch only
     - Creates branch, runs update script, creates PR for review
   - Add documentation in README.md about monthly manual trigger
   - Validation: Workflows run successfully, create appropriate notifications/PRs

2. **Create plugin settings interface**
   - Define settings TypeScript interface (API key, model selection, storage location)
   - Implement default settings
   - Create settings tab UI with proper validation
   - Add secure API key input field (password-style)
   - Validation: Settings persist across Obsidian restarts

3. **Set up project structure**
   - Create src/ directory structure (commands/, services/, ui/, utils/, types.ts)
   - Move main.ts logic to src/main.ts
   - Update esbuild.config.mjs to use src/ as entry point
   - Validation: npm run dev builds successfully

## Phase 2: YouTube Integration

4. **Implement YouTube URL parsing and validation**
   - Create YouTube URL parser utility (extract video ID)
   - Support multiple YouTube URL formats (youtube.com, youtu.be, with timestamps)
   - Add URL validation
   - Validation: Unit tests for various URL formats pass

5. **Implement YouTube metadata extraction using YouTube.js**
   - Initialize Innertube client from YouTube.js
   - Fetch video info using `innertube.getInfo(videoId)`
   - Extract metadata (title, duration, language, available captions)
   - Detect original video language (not auto-translated)
   - Handle API errors and rate limits gracefully
   - Validation: Successfully extracts metadata for test videos of various lengths

6. **Implement YouTube transcription download using YouTube.js**
   - Get transcript using YouTube.js transcript API
   - Handle multiple caption track formats (auto-generated, manual)
   - Filter for original language only (no translations)
   - Format transcription with timestamps
   - Validation: Downloads and formats existing captions correctly

## Phase 3: Audio Extraction

7. **Implement YouTube audio extraction using YouTube.js**
   - Use YouTube.js `video.download()` method for audio extraction
   - Support audio-only format selection (opus, m4a, etc.)
   - Save to temporary directory with proper cleanup
   - Show download progress to user
   - Validation: Successfully downloads audio from videos of various lengths (test with 5min, 1hr, 4hr samples)

8. **Implement audio segmentation strategy for large videos**
   - Check video duration from YouTube.js metadata
   - For videos >2 hours, download in time-based segments (15-minute chunks)
   - Use YouTube.js to download each segment separately
   - Calculate segment timestamps for proper merging
   - Validation: Successfully downloads and segments an 8-hour video

## Phase 4: Whisper Transcription

9. **Implement Whisper API integration**
   - Create OpenAI API client wrapper
   - Implement API key validation
   - Add error handling (invalid key, quota exceeded, network errors)
   - Validation: Successfully authenticates with valid API key, gracefully handles invalid key

10. **Implement transcription for single audio files**
    - Send audio to Whisper API with selected model
    - Handle API response and format transcription
    - Extract timestamps if available
    - Show transcription progress
    - Validation: Successfully transcribes a 5-minute test video

11. **Implement chunked transcription for large videos**
    - Download and transcribe time-based segments sequentially
    - Merge transcription results preserving timestamps (add offset based on segment start time)
    - Handle segment-level errors (retry logic)
    - Track overall progress across segments
    - Validation: Successfully transcribes a 2-hour video in segments

12. **Implement model selection**
    - Allow users to select Whisper model in settings
    - Support whisper-1 and any specific model versions
    - Show model capabilities/limitations in UI
    - Validation: Transcription uses selected model

## Phase 5: Transcription Management

13. **Implement transcription formatting**
    - Format transcription as Markdown
    - Include video metadata (title, URL, date)
    - Add timestamps for seekable sections
    - Create clean, readable output
    - Validation: Generated Markdown is properly formatted and renders in Obsidian

14. **Implement storage location options**
    - Support saving to user-configured folder (e.g., "Transcriptions/")
    - Support saving to same folder as active note
    - Support direct insertion into active note
    - Handle folder creation if needed
    - Validation: Each storage option works correctly

15. **Implement file naming and conflict resolution**
    - Generate transcription filenames from video title (sanitized)
    - Handle filename conflicts (append number or timestamp)
    - Validate filenames are valid for file system
    - Validation: No file overwrites, handles special characters in video titles

## Phase 6: User Interface

16. **Create transcription command**
    - Add command "Transcribe YouTube video"
    - Prompt user for YouTube URL
    - Show transcription method selection (Whisper, YouTube, or Both)
    - Validation: Command appears in command palette

17. **Create progress modal**
    - Show current step (downloading, extracting, transcribing)
    - Display progress percentage for long operations
    - Allow cancellation of in-progress transcriptions
    - Show estimated time remaining
    - Validation: Progress updates smoothly during transcription

18. **Implement error notifications**
    - User-friendly error messages for common failures
    - Actionable guidance (e.g., "Check API key in settings")
    - Log detailed errors to console for debugging
    - Validation: All error scenarios show appropriate messages

## Phase 7: Transcription Comparison

19. **Create comparison view UI**
    - Design two-panel side-by-side layout
    - Synchronize scrolling between panels
    - Highlight differences (optional, basic highlighting)
    - Add export/copy functionality
    - Validation: Comparison view displays both transcriptions correctly

20. **Implement comparison data preparation**
    - Fetch both Whisper and YouTube transcriptions
    - Align transcriptions by timestamp if possible
    - Format for side-by-side display
    - Validation: Both transcriptions load and align properly

## Phase 8: Polish and Cleanup

21. **Implement temporary file cleanup**
    - Clean up downloaded audio segments after transcription
    - Clean up all temporary files on completion
    - Handle cleanup on error/cancellation
    - Validation: No temporary files left after successful or failed transcription

22. **Add input validation and guards**
    - Validate API key format before API calls
    - Validate YouTube URLs before processing
    - Check vault permissions for file writing
    - Validation: Invalid inputs show helpful errors, no crashes

23. **Performance optimization**
    - Optimize chunk size for Whisper API (balance speed vs. cost)
    - Add caching for video metadata
    - Debounce/throttle UI updates during long operations
    - Validation: Transcription completes in reasonable time, UI stays responsive

24. **Write user documentation**
    - Update README.md with setup instructions
    - Document settings and their effects
    - Provide troubleshooting guide
    - Include example screenshots
    - Validation: Documentation is clear and complete

25. **Test end-to-end workflows**
    - Test short video (5 min) with Whisper
    - Test medium video (1 hour) with chunking
    - Test long video (4+ hours) with chunking
    - Test YouTube transcription download
    - Test comparison view
    - Test all storage location options
    - Test error scenarios (invalid API key, invalid URL, network failure)
    - Validation: All workflows complete successfully

## Dependencies and Parallelization

**Can be done in parallel:**
- Tasks 4, 5, 6 (YouTube integration tasks are independent)
- Tasks 13, 14, 15 (Transcription management tasks)
- Tasks 16, 17, 18 (UI tasks)

**Sequential dependencies:**
- Tasks 1, 2, 3 must complete before any other work
- Task 7 must complete before task 8 (audio chunking needs audio extraction)
- Tasks 9, 10 must complete before task 11 (chunked transcription needs basic transcription)
- Tasks 5, 6, 10 must complete before task 19, 20 (comparison needs YouTube and Whisper working)
- Task 21 can only be done after tasks 7, 11 (cleanup needs to know what files are created)
- Tasks 24, 25 should be last (documentation and testing)

## Notes

- Each task should result in a working, testable increment
- Prefer small, focused commits for each completed task
- Run `npm run build` and test in Obsidian after each significant change
- Keep security in mind: never log API keys, sanitize user inputs
