# Project Context

## Purpose
Obsidian plugin for transcribing YouTube videos using OpenAI Whisper API or downloading existing YouTube captions. Enables knowledge workers to create searchable, editable text transcriptions of YouTube content directly within their Obsidian vault.

## Tech Stack
- TypeScript 5
- Node.js 22
- esbuild (bundler)
- Obsidian API (latest)
- OpenAI SDK for Whisper API
- YouTube.js (youtubei.js) - YouTube InnerTube API client for video/audio download and metadata

## Project Conventions

### Code Style
- TypeScript with strict mode enabled
- ESLint for linting (config in .eslintrc)
- Prefer explicit types over inference for public APIs
- Use async/await over promise chains
- Never log API keys or sensitive user data

### Architecture Patterns
- Plugin follows Obsidian's plugin lifecycle (onload/onunload)
- Modular service-based architecture (src/services/)
- Separation of concerns: UI, business logic, and data access
- Keep main.ts minimal - delegate to specialized modules
- Use Obsidian's register* helpers for cleanup
- Centralized error handling with user-friendly messages

### Testing Strategy
- Manual testing in Obsidian development vault
- Test with videos of varying lengths (5 min, 1 hour, 4+ hours)
- Test all storage location options
- Test error scenarios (invalid API key, network failures, etc.)
- Future: Unit tests for utilities, integration tests for services

### Git Workflow
- Main branch: master
- Conventional commit messages
- Small, focused commits per task
- No force push to master

## Domain Context
- **Obsidian**: Markdown-based note-taking app with plugin ecosystem
- **Whisper API**: OpenAI's speech-to-text service (25MB file limit, charges per minute)
- **YouTube transcriptions**: May be auto-generated or manual; avoid auto-translated versions
- **Original language detection**: Critical for quality; use video's default language, not translations
- **InnerTube API**: YouTube's private API used by all YouTube clients; accessed via YouTube.js
- **Chunking**: Use time-based segment downloads (YouTube.js supports range requests)
- **Desktop-only plugin**: Allows Node.js APIs, subprocess calls, file system access
- **Dependency resilience**: Vendor critical dependencies to protect against npm package removal

## Important Constraints
- Desktop-only (isDesktopOnly: true) - no mobile support
- Requires user-provided OpenAI API key (costs money)
- No external binary dependencies (must work on Windows, Mac, Linux without additional installs)
- Must respect Obsidian plugin guidelines (no telemetry, local-first, etc.)
- Bundle size should be <500KB
- Must clean up all temporary files
- Never overwrite files without user confirmation
- Critical dependencies should be vendored/archived in repo for long-term resilience

## External Dependencies
- **OpenAI Whisper API**: Requires API key, network connection, costs $0.006/minute
- **YouTube**: Audio download subject to rate limiting and quota restrictions
- **Obsidian API**: Plugin follows Obsidian's API patterns and lifecycle
