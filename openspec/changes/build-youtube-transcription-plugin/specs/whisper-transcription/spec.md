# Spec: whisper-transcription

## ADDED Requirements

### Requirement: Validate and store OpenAI API key
The system MUST securely store and validate the user's OpenAI API key for Whisper API access.

**Rationale:** API key is required for all Whisper transcriptions. It must be validated before use to prevent wasted time on invalid credentials.

#### Scenario: Store API key in settings
- **Given** a user enters an OpenAI API key in plugin settings
- **When** the settings are saved
- **Then** the API key is stored securely in Obsidian's plugin data
- **And** the API key is never logged to console or error messages
- **And** the API key persists across Obsidian restarts

#### Scenario: Validate API key format
- **Given** a user enters a string in the API key field
- **When** the system validates the API key
- **Then** the key format is checked against OpenAI's format (starts with "sk-", specific length)
- **And** invalid formats are rejected with message "Invalid API key format"

#### Scenario: Validate API key with OpenAI
- **Given** a user has entered a properly formatted API key
- **When** the first transcription is attempted
- **Then** a test API call is made to verify authentication
- **And** invalid keys return error "API key is invalid or inactive"
- **And** the user is directed to OpenAI platform to check their key

#### Scenario: Handle missing API key
- **Given** a user has not configured an API key
- **When** a Whisper transcription is requested
- **Then** an error is shown: "OpenAI API key required"
- **And** a button to open settings is provided
- **And** the transcription does not proceed

---

### Requirement: Select Whisper model
The system MUST allow users to select which Whisper model to use for transcription.

**Rationale:** Different models have different speed, cost, and accuracy trade-offs. Users should control this based on their needs and budget.

#### Scenario: Select default Whisper model
- **Given** a user has not changed the model setting
- **When** a transcription is requested
- **Then** the "whisper-1" model is used (OpenAI's default)
- **And** the model selection is shown in settings

#### Scenario: Select specific Whisper model
- **Given** a user selects a specific model (e.g., "whisper-1") in settings
- **When** a transcription is requested
- **Then** the selected model is used for all API calls
- **And** the model name is included in API requests

#### Scenario: Display model information
- **Given** a user views the model selection dropdown
- **When** the settings tab is displayed
- **Then** each model option shows relevant information (speed, cost, quality)
- **And** a link to OpenAI pricing is provided

---

### Requirement: Transcribe audio files under 25MB
The system MUST send audio files to Whisper API and receive formatted transcriptions.

**Rationale:** Core functionality for small to medium videos that don't require chunking.

#### Scenario: Transcribe short audio file
- **Given** an audio file is less than 25MB
- **When** the system sends it to Whisper API
- **Then** the API returns a text transcription
- **And** the transcription includes timestamps if available
- **And** the detected language is returned

#### Scenario: Include language hint
- **Given** the original video language was detected (e.g., "es" for Spanish)
- **When** the audio is sent to Whisper API
- **Then** the language code is included in the API request
- **And** transcription accuracy is improved for non-English content

#### Scenario: Handle transcription API errors
- **Given** the Whisper API returns an error (invalid file, unsupported format, etc.)
- **When** the system receives the error response
- **Then** a user-friendly error message is shown
- **And** the specific API error is logged to console for debugging
- **And** the user can retry or cancel

#### Scenario: Show transcription progress
- **Given** an audio file is being transcribed
- **When** the API request is in progress
- **Then** a progress indicator shows "Transcribing..."
- **And** the user knows the operation is ongoing (not frozen)

---

### Requirement: Handle audio files larger than 25MB with chunking
The system MUST split large audio files into chunks and transcribe each chunk separately.

**Rationale:** Whisper API has a 25MB file size limit. Videos longer than ~2 hours often exceed this limit.

#### Scenario: Detect when chunking is needed
- **Given** an audio file is larger than 25MB
- **When** the system prepares for transcription
- **Then** the audio file is identified as requiring chunking
- **And** the user is notified that chunking will occur
- **And** estimated number of chunks is calculated

#### Scenario: Split audio into chunks
- **Given** an audio file is 100MB (requires chunking)
- **When** the system processes the file
- **Then** the audio is split into chunks of approximately 20MB each
- **And** each chunk duration is approximately 10-15 minutes
- **And** chunks are saved to temporary directory
- **And** chunk files are named sequentially (chunk-01.m4a, chunk-02.m4a, etc.)

#### Scenario: Transcribe chunks sequentially
- **Given** an audio file has been split into 5 chunks
- **When** transcription begins
- **Then** each chunk is sent to Whisper API sequentially
- **And** progress is updated after each chunk ("Transcribing chunk 2 of 5...")
- **And** chunk transcriptions are stored temporarily

#### Scenario: Merge chunk transcriptions
- **Given** all chunks have been transcribed
- **When** the system merges results
- **Then** transcriptions are combined in correct order
- **And** timestamps are adjusted to reflect original audio timeline
- **And** the final merged transcription is coherent
- **And** chunk boundaries are not visible in final output

#### Scenario: Handle chunk transcription failure
- **Given** transcription of chunk 3 out of 5 fails
- **When** the system detects the failure
- **Then** the failed chunk is retried up to 3 times
- **And** if retries fail, the entire transcription is marked as failed
- **And** all temporary files are cleaned up
- **And** the user is notified which chunk failed and why

#### Scenario: Show overall progress during chunked transcription
- **Given** a large file is being transcribed in 8 chunks
- **When** chunks are being processed
- **Then** progress shows "Transcribing chunk 3 of 8 (37%)"
- **And** overall progress bar reflects total completion
- **And** estimated time remaining is calculated based on chunk processing time

---

### Requirement: Optimize chunk size for efficiency
The system MUST determine optimal chunk size balancing API limits, speed, and cost.

**Rationale:** Smaller chunks mean more API calls (slower, potentially more expensive). Larger chunks risk hitting size limit and failing.

#### Scenario: Calculate chunk size for large file
- **Given** an audio file is 200MB
- **When** the system calculates chunking strategy
- **Then** chunk size is set to approximately 20MB (safety margin below 25MB limit)
- **And** chunk duration is calculated based on audio bitrate
- **And** total number of chunks is minimized while staying under limit

#### Scenario: Adjust for varying bitrates
- **Given** different videos have different audio bitrates
- **When** the system determines chunk size
- **Then** chunk duration varies to maintain consistent file size
- **And** higher bitrate audio results in shorter duration chunks
- **And** lower bitrate audio results in longer duration chunks

---

### Requirement: Handle API rate limits and quota errors
The system MUST gracefully handle OpenAI API rate limiting and quota exhaustion.

**Rationale:** Users may hit rate limits or run out of API credits. The plugin should provide clear guidance rather than cryptic errors.

#### Scenario: Handle rate limit error
- **Given** the OpenAI API returns a rate limit error (429 status)
- **When** the system receives this error
- **Then** the error message states "OpenAI rate limit reached"
- **And** the user is advised to wait before retrying
- **And** the retry-after header is read if available
- **And** automatic retry is attempted after the suggested delay

#### Scenario: Handle quota exceeded error
- **Given** the OpenAI API returns a quota exceeded error
- **When** the system receives this error
- **Then** the error message states "OpenAI API quota exceeded"
- **And** the user is directed to check their OpenAI billing and limits
- **And** a link to OpenAI platform is provided

#### Scenario: Handle insufficient credits error
- **Given** the user's OpenAI account has insufficient credits
- **When** a transcription is attempted
- **Then** the error message states "Insufficient OpenAI credits"
- **And** the user is directed to add credits to their account
- **And** no further API calls are made until issue is resolved

---

### Requirement: Estimate transcription cost
The system MUST provide cost estimates to help users manage API spending.

**Rationale:** Whisper API charges per minute of audio. Users should know approximate cost before starting long transcriptions.

#### Scenario: Estimate cost before transcription
- **Given** a video is 2 hours long
- **When** the user initiates transcription
- **Then** an estimated cost is shown (e.g., "Estimated cost: $0.36")
- **And** the user can confirm or cancel
- **And** cost is calculated based on current Whisper API pricing ($0.006/minute)

#### Scenario: Show cost in progress modal
- **Given** a transcription is in progress
- **When** the progress modal is displayed
- **Then** the estimated cost is shown
- **And** the cost updates if actual duration differs from estimate

---

### Requirement: Support multiple audio formats
The system MUST handle various audio formats extracted from YouTube.

**Rationale:** YouTube provides audio in different formats (m4a, opus, webm). Whisper API supports multiple formats but may require conversion.

#### Scenario: Transcribe m4a audio
- **Given** YouTube audio is downloaded as m4a
- **When** the audio is sent to Whisper API
- **Then** the API accepts and transcribes the file successfully

#### Scenario: Transcribe opus audio
- **Given** YouTube audio is downloaded as opus
- **When** the audio is sent to Whisper API
- **Then** the API accepts and transcribes the file successfully

#### Scenario: Convert unsupported formats
- **Given** YouTube audio is in a format not directly supported by Whisper API
- **When** the system prepares the audio
- **Then** the audio is converted to a supported format (m4a) using ffmpeg
- **And** the converted file is sent to Whisper API
- **And** temporary converted file is cleaned up after transcription
