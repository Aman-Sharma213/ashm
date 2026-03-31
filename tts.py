from fastapi import FastAPI
from fastapi.responses import Response
import subprocess
import uuid
import os

app = FastAPI()

PIPER_PATH = "D:/piper/piper.exe"
MODEL_PATH = "D:/piper/voices/en_US-lessac-medium.onnx"
CONFIG_PATH = "D:/piper/voices/en_US-lessac-medium.onnx.json"
ESPEAK_PATH = "D:/piper/espeak-ng-data"

@app.post("/tts")
async def tts(data: dict):
    text = data.get("text", "")

    output_file = f"temp_{uuid.uuid4().hex}.wav"

    process = subprocess.Popen(
        [
            PIPER_PATH,
            "-m", MODEL_PATH,
            "-c", CONFIG_PATH,
            "-f", output_file,
            "--espeak_data", ESPEAK_PATH
        ],
        stdin=subprocess.PIPE,
        text=True
    )

    process.communicate(text + "\n")

    with open(output_file, "rb") as f:
        audio = f.read()

    os.remove(output_file)

    return Response(content=audio, media_type="audio/wav")