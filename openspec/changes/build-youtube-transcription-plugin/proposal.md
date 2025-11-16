# build-youtube-transcription-plugin

## Why

Users need a way to create text transcriptions from YouTube videos directly within Obsidian for note-taking, research, and content analysis. This plugin enables local transcription using OpenAI Whisper API or downloading existing YouTube transcriptions, supporting the knowledge management workflow.

Key drivers:
- Enable transcription of YouTube content (from short clips to 8-hour videos) for research and note-taking
- Provide flexibility to use either AI-powered transcription (Whisper) or existing YouTube captions
- Support local processing and user control over transcription model selection
- Allow comparison between Whisper and YouTube transcriptions for quality assessment
- Detect and preserve the original video language (no auto-translation)

## What Changes

This proposal introduces a new Obsidian plugin with four core capabilities:

### New Capabilities
1. **YouTube Audio Extraction** - Extract audio from YouTube videos using bundled JavaScript solution
2. **Whisper Transcription** - Transcribe audio using OpenAI Whisper API with configurable models
3. **Transcription Management** - Store, organize, and insert transcriptions into vault
4. **Transcription Comparison** - Compare Whisper and YouTube transcriptions side-by-side

### Technical Approach
- Desktop-only plugin (isDesktopOnly: true) for full Node.js API access
- OpenAI Whisper API for transcription (requires user API key)
- **YouTube.js (youtubei.js)** - InnerTube API wrapper for audio/video download, metadata, and captions
  - Actively maintained (v16.0.1, October 2025)
  - No API keys required
  - Full TypeScript support
- Support for videos from minutes to 8+ hours (time-based segment downloads for large videos)
- No external binary dependencies - works on Windows, Mac, and Linux out of the box
- **Dependency vendoring** - Critical dependencies archived in repo for long-term resilience
- Flexible storage: dedicated folder, same folder as active note, or direct insertion
- Language detection from YouTube metadata (original language, not translations)

## Impact

### User-Facing Changes
- New plugin command: "Transcribe YouTube video"
- Settings panel for:
  - OpenAI API key configuration
  - Whisper model selection (whisper-1, or specific model versions)
  - Default transcription storage location
  - YouTube transcription fallback toggle
- Optional transcription comparison view (two-panel side-by-side)
- Progress indicators for long-running transcriptions

### Technical Impact
- New dependencies: OpenAI API client, YouTube.js (youtubei.js) for YouTube integration
- Audio segment handling (temporary storage, cleanup)
- API rate limiting and error handling for OpenAI and YouTube
- Time-based segment downloads for long videos (>2 hours)
- Network bandwidth for audio download and API calls
- No external binary dependencies required
- Vendored dependencies committed to repo (~1-2 MB) for resilience

### Breaking Changes
None - this is a new plugin with no existing behavior to break.

### Migration Required
None - fresh plugin installation.

## Future Considerations

- AWS Lambda endpoint for cloud-based transcription (mentioned as future enhancement)
- Support for other transcription services
- Batch transcription of multiple videos
- Transcription editing/correction interface
- Integration with Obsidian's audio player plugin
