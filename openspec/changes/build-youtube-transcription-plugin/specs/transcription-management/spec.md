# Spec: transcription-management

## ADDED Requirements

### Requirement: Format transcriptions as Markdown
The system MUST format transcriptions as readable, well-structured Markdown documents.

**Rationale:** Obsidian uses Markdown as its native format. Transcriptions should integrate seamlessly with existing notes and leverage Markdown features.

#### Scenario: Format basic transcription
- **Given** a Whisper transcription is complete
- **When** the system formats the output
- **Then** the transcription is structured as Markdown
- **And** the document includes a title (video title)
- **And** the document includes metadata (source URL, date, transcription method)
- **And** the transcription text is readable with proper paragraphs

#### Scenario: Include video metadata
- **Given** a transcription from YouTube video "How to Make Pasta"
- **When** the Markdown is generated
- **Then** the document includes:
  - Title: "# How to Make Pasta"
  - Source: "[Source](https://youtube.com/watch?v=...)"
  - Date: "Transcribed: YYYY-MM-DD"
  - Method: "Method: Whisper (whisper-1)"
  - Language: "Language: en"
  - Duration: "Duration: 12:34"

#### Scenario: Format timestamps
- **Given** a transcription includes timestamps
- **When** the Markdown is generated
- **Then** timestamps are formatted as `[MM:SS]` or `[HH:MM:SS]`
- **And** timestamps are clickable links (if supported by future YouTube player integration)
- **And** timestamps are visually distinct from content

#### Scenario: Format long transcription
- **Given** a transcription is from a 4-hour video
- **When** the Markdown is generated
- **Then** the text is broken into logical paragraphs
- **And** section breaks are inserted every 10-15 minutes for readability
- **And** the document is not a single long paragraph

---

### Requirement: Support flexible storage locations
The system MUST save transcriptions to user-specified locations in the vault.

**Rationale:** Different users have different organizational preferences. Flexibility improves usability and integration with existing workflows.

#### Scenario: Save to dedicated folder
- **Given** the user has configured storage location as "Transcriptions/"
- **When** a transcription completes
- **Then** the transcription is saved to "Transcriptions/video-title.md"
- **And** the folder is created if it doesn't exist
- **And** the full file path is shown to the user

#### Scenario: Save to same folder as active note
- **Given** the user selects "Same folder as active note" storage option
- **And** the active note is in "Research/Videos/"
- **When** a transcription completes
- **Then** the transcription is saved to "Research/Videos/video-title.md"
- **And** the transcription is adjacent to the related note

#### Scenario: Insert into active note
- **Given** the user selects "Insert into active note" storage option
- **And** a note is currently open
- **When** a transcription completes
- **Then** the transcription is appended to the end of the active note
- **And** a separator (e.g., "---") is inserted before the transcription
- **And** the note scrolls to show the new content

#### Scenario: Handle no active note for insertion
- **Given** the user selects "Insert into active note" option
- **But** no note is currently open
- **When** a transcription completes
- **Then** an error message asks the user to open a note or change storage option
- **And** the transcription is held in memory temporarily
- **And** the user can retry after opening a note

#### Scenario: Prompt for storage location per transcription
- **Given** the user wants to override default storage setting
- **When** the transcription command is invoked
- **Then** a dropdown allows selecting storage location for this transcription
- **And** the selection applies only to current transcription
- **And** the default setting is preserved

---

### Requirement: Generate valid filenames from video titles
The system MUST create safe, readable filenames from potentially problematic video titles.

**Rationale:** Video titles may contain special characters, emojis, or slashes that are invalid in filenames.

#### Scenario: Sanitize simple title
- **Given** a video title is "Introduction to Python"
- **When** a filename is generated
- **Then** the filename is "Introduction to Python.md"
- **And** spaces are preserved for readability

#### Scenario: Sanitize title with special characters
- **Given** a video title is "How to Fix: The \"Error\" Problem!"
- **When** a filename is generated
- **Then** special characters (quotes, colons) are removed or replaced
- **And** the filename is "How to Fix The Error Problem.md"
- **And** the filename is valid on all operating systems (Windows, Mac, Linux)

#### Scenario: Sanitize title with path separators
- **Given** a video title is "React/Next.js Tutorial"
- **When** a filename is generated
- **Then** the slash is replaced with a safe character (e.g., dash or space)
- **And** the filename is "React-Next.js Tutorial.md"
- **And** no unintended subdirectories are created

#### Scenario: Sanitize title with emojis
- **Given** a video title is "🔥 Amazing Coding Tips 🚀"
- **When** a filename is generated
- **Then** emojis are removed or replaced
- **And** the filename is "Amazing Coding Tips.md"
- **And** the filename is ASCII-compatible

#### Scenario: Handle very long titles
- **Given** a video title is longer than 200 characters
- **When** a filename is generated
- **Then** the title is truncated to a reasonable length (e.g., 100 chars)
- **And** the filename ends at a word boundary (not mid-word)
- **And** " ..." is appended to indicate truncation

#### Scenario: Handle duplicate filenames
- **Given** a transcription file "Python Tutorial.md" already exists
- **When** another video with the same title is transcribed
- **Then** the new filename is "Python Tutorial 2.md"
- **And** subsequent duplicates are "Python Tutorial 3.md", etc.
- **And** existing files are never overwritten without user confirmation

---

### Requirement: Distinguish transcription methods in filenames
The system MUST indicate transcription source (Whisper, YouTube, or comparison) in filenames.

**Rationale:** Users may transcribe the same video multiple ways and need to distinguish results.

#### Scenario: Save Whisper transcription
- **Given** a video is transcribed using Whisper
- **When** the file is saved
- **Then** the filename includes "-whisper" suffix (e.g., "Video Title-whisper.md")

#### Scenario: Save YouTube transcription
- **Given** a video's YouTube captions are downloaded
- **When** the file is saved
- **Then** the filename includes "-youtube" suffix (e.g., "Video Title-youtube.md")

#### Scenario: Save comparison transcription
- **Given** both Whisper and YouTube transcriptions are generated
- **When** the comparison is saved
- **Then** the filename includes "-comparison" suffix (e.g., "Video Title-comparison.md")
- **And** both transcriptions are included in the single file

---

### Requirement: Handle file write permissions and errors
The system MUST gracefully handle filesystem errors during save operations.

**Rationale:** Users may have permission issues, disk space limitations, or vault folder misconfigurations.

#### Scenario: Handle write permission denied
- **Given** the target folder is read-only or user lacks write permission
- **When** the system attempts to save transcription
- **Then** an error message states "Permission denied writing to [path]"
- **And** the user is prompted to select an alternative location
- **And** the transcription remains in memory until successfully saved

#### Scenario: Handle insufficient disk space
- **Given** the disk is full or nearly full
- **When** the system attempts to save transcription
- **Then** an error message states "Insufficient disk space"
- **And** the user is advised to free up space or choose another location
- **And** no partial files are left on disk

#### Scenario: Handle vault folder not found
- **Given** the configured storage folder doesn't exist
- **When** the system attempts to save transcription
- **Then** the folder is created automatically (with user confirmation if not default)
- **And** the transcription is saved successfully

---

### Requirement: Preserve transcription metadata
The system MUST store metadata about transcriptions for potential future features.

**Rationale:** Metadata enables searching, filtering, and re-processing transcriptions without re-downloading videos.

#### Scenario: Include frontmatter metadata
- **Given** a transcription is saved
- **When** the Markdown file is generated
- **Then** YAML frontmatter includes:
  ```yaml
  ---
  source: youtube
  video_id: dQw4w9WgXcQ
  video_title: "Original Title"
  video_url: "https://youtube.com/watch?v=dQw4w9WgXcQ"
  transcription_method: whisper
  transcription_model: whisper-1
  language: en
  duration: 734
  transcribed_date: 2025-11-15T10:30:00Z
  ---
  ```
- **And** metadata is structured for Obsidian's metadata features

#### Scenario: Enable metadata-based search
- **Given** multiple transcriptions exist in the vault
- **When** a user searches for transcriptions by source or method
- **Then** Obsidian's search can filter by frontmatter fields
- **And** transcriptions are easily discoverable

---

### Requirement: Show transcription completion notification
The system MUST notify users when transcriptions complete, especially for long-running operations.

**Rationale:** Long transcriptions may take 10+ minutes. Users need confirmation when complete.

#### Scenario: Notify on successful completion
- **Given** a transcription completes successfully
- **When** the file is saved
- **Then** a notification shows "Transcription complete: [filename]"
- **And** clicking the notification opens the transcription file
- **And** the notification persists until dismissed

#### Scenario: Notify on failure
- **Given** a transcription fails at any step
- **When** the error is handled
- **Then** a notification shows "Transcription failed: [reason]"
- **And** clicking the notification shows detailed error information
- **And** the notification includes a retry option if applicable

---

### Requirement: Cache transcriptions to avoid re-processing
The system MUST track which videos have been transcribed to avoid redundant work.

**Rationale:** Users may accidentally attempt to transcribe the same video twice. Caching prevents wasted API credits and time.

#### Scenario: Detect existing transcription
- **Given** a video has already been transcribed
- **When** the user attempts to transcribe it again
- **Then** a warning message asks "This video has been transcribed before. Re-transcribe?"
- **And** the existing transcription file is linked
- **And** the user can choose to re-transcribe or open existing

#### Scenario: Track transcriptions by video ID
- **Given** transcriptions are cached
- **When** a new transcription is saved
- **Then** the video ID is stored in a cache index
- **And** future lookups can quickly check if video was transcribed
- **And** the cache persists across Obsidian restarts

#### Scenario: Clear transcription cache
- **Given** the cache may become outdated or incorrect
- **When** the user clears the cache in settings
- **Then** all cache entries are removed
- **And** future transcriptions are treated as new
- **And** existing transcription files are not affected
