from fastapi import FastAPI, UploadFile, File, Form, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
import shutil, os, tempfile
import urllib.request, urllib.parse, json

import model
from textExtraction import load_user_pdf

from faster_whisper import WhisperModel

# load whisper once
whisper_model = WhisperModel(
    "base",
    device="cpu",
    compute_type="int8"
)

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

@app.get("/")
def home():
    return FileResponse("templates/index.html")

@app.get("/study")
def study():
    return FileResponse("templates/study.html")

@app.get("/papers")
def papers():
    return FileResponse("templates/papers.html")

@app.get("/list-papers")
def list_papers():
    files = []
    if os.path.exists(UPLOAD_DIR):
        files = [f for f in os.listdir(UPLOAD_DIR) if f.endswith('.pdf')]
    return {"papers": files}

@app.get("/trending")
def trending():
    return FileResponse("templates/trending.html")

@app.get("/trending-papers")
def trending_papers(query: str = Query("AI")):
    """Proxy for Semantic Scholar API to avoid browser CORS / rate-limit issues."""
    try:
        encoded = urllib.parse.quote(query)
        url = (
            f"https://api.semanticscholar.org/graph/v1/paper/search"
            f"?query={encoded}&limit=10&fields=title,authors,year,citationCount,externalIds"
        )
        req = urllib.request.Request(url, headers={"User-Agent": "AI-Research-Assistant/1.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            raw = resp.read().decode("utf-8")
        data = json.loads(raw)

        papers = []
        for p in data.get("data", []):
            # Build a Semantic Scholar paper link from paperId if url not present
            paper_id = p.get("paperId", "")
            ss_url = f"https://www.semanticscholar.org/paper/{paper_id}" if paper_id else "#"
            doi = (p.get("externalIds") or {}).get("DOI", "")
            read_url = f"https://doi.org/{doi}" if doi else ss_url

            authors = p.get("authors", [])
            authors_str = ", ".join(a["name"] for a in authors[:3])
            if len(authors) > 3:
                authors_str += f" +{len(authors)-3} more"

            papers.append({
                "title":       p.get("title", "Untitled"),
                "authors":     authors_str or "Unknown Authors",
                "year":        p.get("year") or "N/A",
                "citations":   p.get("citationCount", 0),
                "url":         read_url,
                "ss_url":      ss_url,
            })

        return JSONResponse({"papers": papers})
    except Exception as e:
        return JSONResponse({"error": str(e), "papers": []}, status_code=500)



class Query(BaseModel):
    message: str
    thread_id: str

def run_chat(user_text, thread_id):
    state = {"question": user_text, "context": "", "type": "", "ans": ""}
    config_local = {"configurable": {"thread_id": thread_id}}
    result = model.graph_app.invoke(state, config=config_local)
    return result["ans"]

@app.post("/chat")
def chat(query: Query):
    return {"response": run_chat(query.message, query.thread_id)}

# -------- VOICE (ONLY STT NOW) -------- #

@app.post("/voice-chat")
async def voice_chat(file: UploadFile = File(...), thread_id: str = "default"):
    try:
        # save temp audio
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp:
            temp.write(await file.read())
            temp_path = temp.name

        # 🔥 STT
        segments, _ = whisper_model.transcribe(temp_path)

        user_text = ""
        for seg in segments:
            user_text += seg.text

        # delete temp file
        os.remove(temp_path)

        # AI response
        ai_text = run_chat(user_text, thread_id)

        return {
            "user_text": user_text,
            "ai_text": ai_text
        }

    except Exception as e:
        return {"error": str(e)}

# -------- UPLOAD -------- #

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    path = os.path.join(UPLOAD_DIR, file.filename)

    with open(path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {"filename": file.filename}

# -------- PROCESS PDF -------- #

@app.post("/process_pdf")
async def process_pdf(filename: str = Form(...)):
    file_path = os.path.join(UPLOAD_DIR, filename)

    if not os.path.exists(file_path):
        return {"error": "File not found"}

    model.user_db = load_user_pdf(file_path)

    return {"status": "ready"}