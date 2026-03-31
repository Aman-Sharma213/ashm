from faster_whisper import WhisperModel

model = WhisperModel(
    "medium",
    device="cpu",        # change to "cuda" if you have GPU
    compute_type="int8"  # use "float16" if GPU
)

segments, info = model.transcribe("audio.wav")
print("text is -> ")
for segment in segments:
    print( segment.text)