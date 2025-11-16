# Spec: youtube-extraction

## ADDED Requirements

### Requirement: Parse and validate YouTube URLs
The system MUST accept YouTube video URLs in various formats and extract the video ID.

**Rationale:** Users may copy URLs from different sources (address bar, share button, mobile app) which produce different URL formats.

#### Scenario: Parse standard YouTube URL
- **Given** a user provides URL "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
- **When** the system parses the URL
- **Then** the video ID "dQw4w9WgXcQ" is extracted
- **And** the URL is validated as authentic YouTube domain

#### Scenario: Parse short YouTube URL
- **Given** a user provides URL "https://youtu.be/dQw4w9WgXcQ"
- **When** the system parses the URL
- **Then** the video ID "dQw4w9WgXcQ" is extracted
- **And** the URL is validated as authentic YouTube domain

#### Scenario: Parse YouTube URL with timestamp
- **Given** a user provides URL "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s"
- **When** the system parses the URL
- **Then** the video ID "dQw4w9WgXcQ" is extracted
- **And** the timestamp parameter is preserved for potential future use

#### Scenario: Reject invalid YouTube URL
- **Given** a user provides an invalid or non-YouTube URL
- **When** the system attempts to parse the URL
- **Then** an error is returned with message "Invalid YouTube URL"
- **And** the transcription process does not continue

---

### Requirement: Extract video metadata including original language
The system MUST fetch video metadata to determine title, duration, and original language.

**Rationale:** Original language is needed to filter auto-translated captions and provide accurate transcriptions. Title and duration are needed for progress estimation and file naming.

#### Scenario: Fetch metadata for English video
- **Given** a YouTube video ID is valid
- **When** the system fetches metadata
- **Then** the video title is retrieved
- **And** the video duration is retrieved
- **And** the original language code (e.g., "en") is detected
- **And** available caption tracks are enumerated

#### Scenario: Handle video with no detected language
- **Given** a YouTube video has no language metadata
- **When** the system fetches metadata
- **Then** a default language of "en" is assumed
- **And** the user is notified that language detection was inconclusive
- **And** the transcription proceeds with best-effort language detection

#### Scenario: Handle metadata fetch failure
- **Given** a YouTube video ID is valid but metadata fetch fails (network error, private video, etc.)
- **When** the system attempts to fetch metadata
- **Then** an error is returned with specific failure reason
- **And** the user is shown an actionable error message (e.g., "Video may be private or unavailable")

---

### Requirement: Download existing YouTube transcriptions
The system MUST download existing caption tracks from YouTube when available, preferring original language.

**Rationale:** Many videos have human-created or auto-generated captions that may be sufficient without using Whisper API.

#### Scenario: Download auto-generated captions in original language
- **Given** a YouTube video has auto-generated captions in its original language
- **When** the user selects YouTube transcription method
- **Then** the caption track is downloaded
- **And** the captions are formatted with timestamps
- **And** the captions are in the original language (not auto-translated)

#### Scenario: Download manual captions in original language
- **Given** a YouTube video has manually created captions in its original language
- **When** the user selects YouTube transcription method
- **Then** the manual caption track is preferred over auto-generated
- **And** the captions are downloaded and formatted

#### Scenario: Reject auto-translated captions
- **Given** a YouTube video has captions in the original language and auto-translated captions in other languages
- **When** the system filters available caption tracks
- **Then** only the original language caption track is used
- **And** auto-translated caption tracks are ignored

#### Scenario: Handle video with no available captions
- **Given** a YouTube video has no caption tracks
- **When** the user selects YouTube transcription method
- **Then** an error is returned stating "No captions available for this video"
- **And** the user is prompted to use Whisper transcription instead

---

### Requirement: Extract audio from YouTube videos
The system MUST download audio from YouTube videos for local transcription processing.

**Rationale:** Audio is required for Whisper API transcription. Extracting audio-only is more efficient than downloading full video.

#### Scenario: Download audio for short video
- **Given** a YouTube video is 5 minutes long
- **When** the system downloads audio
- **Then** an audio-only file (m4a or opus format) is saved to temporary directory
- **And** download progress is shown to the user
- **And** the audio file is ready for transcription within reasonable time (<30 seconds)

#### Scenario: Download audio for long video
- **Given** a YouTube video is 4 hours long
- **When** the system downloads audio
- **Then** an audio-only file is saved to temporary directory
- **And** download progress is shown with percentage and estimated time
- **And** the download can be cancelled by the user

#### Scenario: Handle audio download failure
- **Given** a YouTube video audio download fails (network error, rate limit, etc.)
- **When** the system attempts to download
- **Then** an error is returned with specific failure reason
- **And** temporary files are cleaned up
- **And** the user is shown an actionable error message with retry option

#### Scenario: Select appropriate audio quality
- **Given** a YouTube video has multiple audio quality options
- **When** the system selects audio to download
- **Then** the highest quality audio-only format is preferred
- **And** the file size is minimized (no video stream)
- **And** the format is compatible with Whisper API (m4a, opus, webm, etc.)

---

### Requirement: Clean up temporary audio files
The system MUST delete temporary audio files after transcription completes or fails.

**Rationale:** Audio files can be large (hundreds of MB for long videos). Leaving them on disk wastes user's storage.

#### Scenario: Clean up after successful transcription
- **Given** a transcription completes successfully
- **When** the final transcription is saved
- **Then** all temporary audio files are deleted
- **And** all temporary chunk files (if any) are deleted
- **And** no audio files remain in the temporary directory

#### Scenario: Clean up after failed transcription
- **Given** a transcription fails at any step
- **When** the error is handled
- **Then** all temporary audio files are deleted
- **And** the user's storage is not filled with incomplete files

#### Scenario: Clean up after user cancellation
- **Given** a user cancels an in-progress transcription
- **When** the cancellation is processed
- **Then** the download is stopped immediately
- **And** all partial and temporary files are deleted
- **And** no orphaned files remain

---

### Requirement: Handle rate limiting and quota errors
The system MUST gracefully handle YouTube rate limiting and quota exhaustion.

**Rationale:** YouTube may rate-limit requests or restrict access. The plugin should provide helpful guidance rather than cryptic errors.

#### Scenario: Handle rate limiting during metadata fetch
- **Given** YouTube API returns a rate limit error
- **When** the system receives the error
- **Then** the error message indicates rate limiting
- **And** the user is advised to wait and retry
- **And** an automatic retry is attempted after a delay (exponential backoff)

#### Scenario: Handle rate limiting during audio download
- **Given** YouTube rate-limits audio download
- **When** the download is blocked
- **Then** the user is notified of temporary rate limit
- **And** the user can retry manually or wait for automatic retry
- **And** the error message includes estimated wait time if available
