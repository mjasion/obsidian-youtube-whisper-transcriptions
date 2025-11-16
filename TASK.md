
I want to build an obsidian plugin, that will be preparing transciptions from youtube videos.
by default I woudl like to use whisper, but the plugin might also as option allow to download transcription available from youtube.

The transcriptions should use default language of the youtube movie. Not automated translation. Plugin has to detect it.

Plugin might also have advanced option to:
- compare whisper and youtube transcription - just two panels, but not like git diff

The youtube movies might have diffrent lenght: from few minutes up to 8 hours, so the audio might be larger sometime. Plugin has to handle this
Plugin also should allow selecting (in settings) which model will be using

In the future I might consider creating a AWS Lambda endpoint, that would make the transcription in the cloud. For now it is not the case. I want to process locally.
