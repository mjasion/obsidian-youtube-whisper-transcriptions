# Spec: transcription-comparison

## ADDED Requirements

### Requirement: Generate both Whisper and YouTube transcriptions
The system MUST support creating both transcription types for the same video to enable comparison.

**Rationale:** Users want to assess transcription quality and choose the better result, or reference both for accuracy.

#### Scenario: Request both transcription methods
- **Given** a YouTube video has available captions
- **When** the user selects "Both" transcription method
- **Then** the system downloads YouTube captions
- **And** the system also downloads audio and transcribes with Whisper
- **And** both transcriptions are prepared for comparison

#### Scenario: Handle video with no YouTube captions for comparison
- **Given** a YouTube video has no available captions
- **When** the user selects "Both" transcription method
- **Then** an error message states "YouTube captions not available, only Whisper transcription will be performed"
- **And** the user can choose to continue with Whisper-only or cancel

#### Scenario: Show progress for dual transcription
- **Given** both transcription methods are in progress
- **When** the progress modal updates
- **Then** each method's progress is shown separately
  - "Downloading YouTube captions... (complete)"
  - "Transcribing with Whisper... (chunk 2 of 5)"
- **And** overall progress reflects combined work

---

### Requirement: Display transcriptions side-by-side
The system MUST present both transcriptions in a readable comparison view.

**Rationale:** User specifically requested "two panels, but not like git diff" – simple side-by-side presentation for quality assessment.

#### Scenario: Open comparison view
- **Given** both Whisper and YouTube transcriptions are complete
- **When** the comparison view is opened
- **Then** a split view is created with two panels
- **And** the left panel displays Whisper transcription
- **And** the right panel displays YouTube transcription
- **And** both panels use Markdown rendering

#### Scenario: Label transcription sources
- **Given** the comparison view is displayed
- **When** the user views the panels
- **Then** the left panel header reads "Whisper Transcription"
- **And** the right panel header reads "YouTube Transcription"
- **And** each header includes model/source details (e.g., "Whisper (whisper-1)")

#### Scenario: Scroll panels independently
- **Given** the comparison view is open
- **When** the user scrolls one panel
- **Then** that panel scrolls independently
- **And** the other panel remains at its current scroll position
- **And** the user can review different sections of each transcription

#### Scenario: Optional synchronized scrolling
- **Given** the comparison view has a "Sync Scroll" toggle
- **When** the toggle is enabled
- **Then** scrolling one panel also scrolls the other
- **And** panels maintain approximately aligned vertical positions
- **And** the user can compare corresponding sections easily

---

### Requirement: Format comparison output for readability
The system MUST structure comparison content for easy reading and reference.

**Rationale:** Raw transcriptions side-by-side may be hard to read. Formatting improves usability.

#### Scenario: Format comparison with clear sections
- **Given** both transcriptions include timestamps
- **When** the comparison view formats content
- **Then** transcriptions are aligned by approximate timestamp when possible
- **And** corresponding sections appear at similar vertical positions
- **And** the alignment is best-effort (not strict line-by-line)

#### Scenario: Preserve timestamps in comparison
- **Given** transcriptions include timestamps
- **When** displayed in comparison view
- **Then** timestamps are visible in both panels
- **And** timestamps help users locate corresponding sections
- **And** timestamps are formatted consistently ([MM:SS] or [HH:MM:SS])

---

### Requirement: Allow exporting comparison
The system MUST enable saving the comparison as a combined document.

**Rationale:** Users may want to reference both transcriptions later or share the comparison.

#### Scenario: Export comparison to single file
- **Given** the comparison view is open
- **When** the user selects "Export Comparison"
- **Then** a single Markdown file is created with both transcriptions
- **And** the file is structured with clear section headers:
  - "## Whisper Transcription"
  - "## YouTube Transcription"
- **And** metadata indicates both methods were used
- **And** the file is saved using the "-comparison" suffix

#### Scenario: Copy transcription from panel
- **Given** the comparison view is open
- **When** the user selects "Copy" from a panel
- **Then** that panel's transcription text is copied to clipboard
- **And** the user can paste it elsewhere (another note, external app)

---

### Requirement: Show quality indicators
The system MUST provide basic quality hints to help users assess transcriptions.

**Rationale:** Users want to know which transcription is likely more accurate without reading entirely. This is a lower-priority feature that enhances usability.

#### Scenario: Show transcription length
- **Given** both transcriptions are displayed
- **When** the comparison view is open
- **Then** word counts are shown in headers (e.g., "Whisper Transcription (1,234 words)")
- **And** significant length differences may indicate quality issues

#### Scenario: Show language confidence
- **Given** Whisper API returns language detection confidence
- **When** the comparison view is displayed
- **Then** detected language and confidence are shown (e.g., "Language: English (95%)")
- **And** low confidence may indicate audio quality issues

---

### Requirement: Handle mismatched content gracefully
The system MUST handle cases where transcriptions differ significantly in structure or length.

**Rationale:** Whisper may include more filler words; YouTube may have manual edits. Content won't align perfectly.

#### Scenario: Display different-length transcriptions
- **Given** Whisper transcription is 2000 words and YouTube is 1500 words
- **When** the comparison view is displayed
- **Then** both transcriptions are shown in full
- **And** shorter panel has white space at the bottom
- **And** no artificial padding is added

#### Scenario: Handle missing YouTube transcription sections
- **Given** YouTube transcription has gaps or missing time ranges
- **When** displayed alongside Whisper transcription
- **Then** gaps are indicated with "[No caption data]" or similar
- **And** the user understands why sections are missing

---

### Requirement: Enable quick navigation between transcriptions
The system MUST allow switching focus between transcription panels efficiently.

**Rationale:** Users may want to quickly reference specific parts of each transcription.

#### Scenario: Jump to timestamp in both panels
- **Given** the user clicks a timestamp in the left panel
- **When** synchronized scrolling is enabled
- **Then** both panels scroll to approximately that timestamp
- **And** the corresponding section in the right panel is visible

#### Scenario: Search within transcription panels
- **Given** the comparison view is open
- **When** the user uses Obsidian's search (Ctrl/Cmd+F)
- **Then** search highlights matches in both panels
- **And** the user can navigate between matches across both transcriptions

---

### Requirement: Respect user storage preferences for comparisons
The system MUST save comparison files according to user-configured storage settings.

**Rationale:** Consistency with single-method transcription storage improves predictability.

#### Scenario: Save comparison to configured folder
- **Given** the user has configured storage location as "Transcriptions/"
- **When** a comparison is exported
- **Then** the file is saved to "Transcriptions/video-title-comparison.md"
- **And** the storage behavior matches single transcription saves

#### Scenario: Insert comparison into active note
- **Given** the user selects "Insert into active note" for comparisons
- **When** the comparison is exported
- **Then** both transcriptions are inserted into the active note
- **And** clear section headers distinguish Whisper from YouTube
- **And** a horizontal rule separates the comparison from existing note content
