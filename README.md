# YouTube Whisper Transcription Plugin for Obsidian

Transcribe YouTube videos directly into your Obsidian vault using OpenAI's Whisper API or download existing YouTube captions. Perfect for researchers, students, content creators, and anyone who wants to capture and reference video content in their notes.

## Features

### 🎯 Multiple Transcription Methods

- **Whisper API**: High-accuracy AI transcription using OpenAI's Whisper model
- **YouTube Captions**: Free and fast - download existing video captions
- **Side-by-Side Comparison**: Generate both transcriptions for quality comparison

### 📝 Smart Markdown Integration

- Automatic formatting with YAML frontmatter
- Video metadata (title, URL, duration, language)
- Timestamped transcriptions for easy reference
- Cross-references with Obsidian's linking system

### 💾 Flexible Storage Options

Choose where transcriptions are saved:

1. **Dedicated Folder**: All transcriptions in one place (default: `Transcriptions/`)
2. **Active Note Folder**: Save alongside your current note
3. **Insert into Active Note**: Append directly to the note you're working on

### 🚀 Advanced Features

- **Long Video Support**: Automatic chunking for videos over 25MB (up to 8+ hours)
- **Cost Estimation**: See estimated API costs before transcribing
- **Duplicate Detection**: Avoid re-transcribing the same video
- **Progress Tracking**: Real-time progress with cancel option
- **Auto-cleanup**: Temporary files cleaned up automatically
- **Error Recovery**: Retry logic with exponential backoff

### 🎨 User Experience

- Simple URL input modal
- Visual progress indicators
- Descriptive error messages
- Keyboard shortcuts
- Ribbon icon for quick access

## Installation

### From Obsidian Community Plugins (Recommended)

1. Open Settings → Community Plugins
2. Browse and search for "YouTube Whisper Transcription"
3. Click Install
4. Enable the plugin

### Manual Installation

1. Download the latest release from the [Releases page](../../releases)
2. Extract the files to your vault's `.obsidian/plugins/youtube-whisper-transcription/` directory
3. Reload Obsidian
4. Enable the plugin in Settings → Community Plugins

## Setup

### Required: OpenAI API Key

To use Whisper transcription, you need an OpenAI API key:

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. In Obsidian, go to Settings → YouTube Whisper Transcription
4. Paste your API key in the "OpenAI API Key" field

**Pricing**: OpenAI charges $0.006 per minute of audio (~$0.36 for a 1-hour video)

### Optional: Configure Storage

1. Open Settings → YouTube Whisper Transcription
2. Choose your preferred storage location
3. Set the dedicated folder path (if using dedicated folder mode)

## Usage

### Basic Transcription

1. Click the video icon in the ribbon, OR
2. Use the command palette (Ctrl/Cmd+P) → "Transcribe YouTube video"
3. Paste the YouTube URL
4. Select transcription method (Whisper / YouTube / Both)
5. Confirm cost estimate (for Whisper)
6. Wait for transcription to complete

### Supported URL Formats

```
https://www.youtube.com/watch?v=VIDEO_ID
https://youtu.be/VIDEO_ID
https://www.youtube.com/watch?v=VIDEO_ID&t=42s
https://www.youtube.com/shorts/VIDEO_ID
https://m.youtube.com/watch?v=VIDEO_ID
```

### Example Output

```markdown
# How to Make Pasta

---
source: youtube
video_id: dQw4w9WgXcQ
video_title: "How to Make Pasta"
video_url: "https://youtube.com/watch?v=dQw4w9WgXcQ"
transcription_method: whisper
transcription_model: whisper-1
language: en
duration: 734
transcribed_date: 2025-11-16T10:30:00Z
---

## Video Information

**Source:** [How to Make Pasta](https://youtube.com/watch?v=dQw4w9WgXcQ)
**Duration:** 12m 14s
**Language:** en
**Transcription Method:** OpenAI Whisper
**Model:** whisper-1
**Transcribed:** 11/16/2025, 10:30:00 AM

## Transcription

[00:00] Welcome to today's cooking tutorial...
[00:15] First, you'll need to boil water...
[01:30] Add salt to the boiling water...
```

## Settings

### OpenAI API Key
Your OpenAI API key for Whisper transcription. Required for Whisper method.

### Whisper Model
Choose the Whisper model. Currently supports `whisper-1` (OpenAI's default).

### Default Storage Location
- **Dedicated folder**: All transcriptions go to one folder
- **Same folder as active note**: Save next to related notes
- **Insert into active note**: Append to current note

### Dedicated Folder Path
When using dedicated folder mode, transcriptions are saved here (relative to vault root). Default: `Transcriptions`

### Enable YouTube Caption Fallback
If enabled, offers to download YouTube captions when available (faster and free).

### Show Cost Estimate
Display estimated API cost before starting Whisper transcription.

## File Naming

Transcriptions are automatically named based on the video title:

- Whisper: `Video Title-whisper.md`
- YouTube: `Video Title-youtube.md`
- Comparison: `Video Title-comparison.md`

Special characters are sanitized, and duplicates get numbered (e.g., `Video Title 2-whisper.md`).

## Limitations & Future Work

### Current Limitations

1. **Audio Segmentation**: Videos with audio files >25MB require ffmpeg for chunking (not yet implemented)
   - Workaround: Most videos under 2 hours work fine
   - Future: Automatic ffmpeg-based segmentation

2. **YouTube Caption Download**: Currently detects captions but full download implementation is simplified
   - Future: Complete caption track parsing with timing

3. **Desktop Only**: Requires Node.js APIs (file system, HTTP downloads)

### Planned Features

- Audio segmentation with ffmpeg for 8+ hour videos
- Batch transcription of multiple videos
- Custom Whisper parameters (temperature, language hints)
- Transcription editing interface
- Integration with dataview for transcription management
- Support for other video platforms

## Architecture

Built with long-term resilience in mind:

- **Vendored Dependencies**: YouTube.js is vendored to prevent breaking changes
- **Modular Design**: Services are decoupled and testable
- **Error Handling**: Comprehensive error messages and retry logic
- **TypeScript**: Full type safety throughout

## Troubleshooting

### "Invalid API key" error
- Check that your API key starts with `sk-`
- Verify the key is active at [OpenAI Platform](https://platform.openai.com)
- Ensure you have available credits

### "No captions available" error
- Try using Whisper method instead
- Some videos don't have captions enabled

### "Audio file too large" error
- Video is >25MB audio (usually >2 hours)
- ffmpeg segmentation will be added in a future update

### Build fails with "Expected ';' but found 'with'"
- Update esbuild to latest version: `npm install --save-dev esbuild@latest`

## Development

### Setup

```bash
git clone https://github.com/mjasion/obsidian-youtube-whisper-transcriptions
cd obsidian-youtube-whisper-transcriptions
npm install
```

### Build

```bash
npm run build    # Production build
npm run dev      # Development with watch mode
```

### Project Structure

```
src/
├── commands/          # Command handlers
│   └── transcription-orchestrator.ts
├── services/          # Business logic
│   ├── youtube-service.ts
│   ├── whisper-service.ts
│   └── audio-processor.ts
├── storage/           # File management
│   └── transcription-storage.ts
├── ui/               # User interface
│   └── progress-modal.ts
├── utils/            # Utilities
│   ├── youtube-url-parser.ts
│   ├── markdown-formatter.ts
│   ├── file-naming.ts
│   └── error-handler.ts
├── settings.ts       # Plugin settings
├── types.ts          # TypeScript types
└── main.ts           # Plugin entry point
```

### Testing

```bash
# Type checking
npm run build

# Manual testing in Obsidian
# 1. Build the plugin
# 2. Copy main.js, manifest.json to test vault's .obsidian/plugins/
# 3. Reload Obsidian
```

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details

## Credits

Built with:
- [OpenAI Whisper API](https://platform.openai.com/docs/guides/speech-to-text)
- [YouTube.js](https://github.com/LuanRT/YouTube.js)
- [Obsidian API](https://github.com/obsidianmd/obsidian-api)

## Support

- Report bugs: [GitHub Issues](../../issues)
- Feature requests: [GitHub Discussions](../../discussions)
- Documentation: [Obsidian Plugin Docs](https://docs.obsidian.md/)

---

Made with ❤️ for the Obsidian community
