# 🧠 AI Research Paper Assistant

An AI-powered research assistant that helps users **upload research papers, understand them, and interact using chat + voice**.

---

## 🚀 Features

* 📄 Upload and process research papers (PDF)
* 🔍 Context-based Q&A using embeddings (FAISS)
* 💬 Chat with your document
* 🎤 Voice input (Speech-to-Text using Whisper)
* 🔊 Text-to-Speech (Piper TTS)
* 🧠 Intelligent routing (Math / General / Deep Explanation)
* 💾 Conversation memory using SQLite

---

## 🏗️ Project Structure

```
project2/
│── main.py                # FastAPI backend
│── model.py               # LangGraph pipeline (LLM logic)
│── textExtraction.py      # PDF processing + embeddings
│── tts.py                 # Text-to-Speech (Piper)
│── whisper.py             # Speech-to-Text test
│── templates/
│    ├── index.html
│    ├── study.html
│    ├── papers.html
│── static/
│    ├── style.css
│    ├── script.js
│── uploads/               # Uploaded PDFs
│── chatbot.db            # Chat memory
│── .env                  # API keys (ignored)
│── .gitignore
```

---

## ⚙️ Tech Stack

* **Backend:** FastAPI
* **LLM:** OpenAI (gpt-4o-mini)
* **Orchestration:** LangGraph
* **Embeddings:** HuggingFace (MiniLM)
* **Vector DB:** FAISS
* **STT:** Faster-Whisper
* **TTS:** Piper
* **Frontend:** HTML, CSS, JS

---

## 📦 Installation

### 1. Clone the repository

```bash
git clone https://github.com/your-username/Smart-Ai-Research-paper-assitant-.git
cd project2
```

---

### 2. Create virtual environment

```bash
python -m venv venv
venv\Scripts\activate
```

---

### 3. Install dependencies

```bash
pip install fastapi uvicorn langchain langchain-community langchain-openai \
langgraph sentence-transformers faiss-cpu python-dotenv faster-whisper
```

---

### 4. Setup `.env`

Create a `.env` file:

```env
OPENAI_API_KEY=your_api_key_here
```

---

## ▶️ Run the Project

```bash
uvicorn main:app --reload
```

Open in browser:

```
http://127.0.0.1:8000
```

---

## 🎯 How It Works

1. Upload a research paper (PDF)
2. Text is extracted and split into chunks
3. Embeddings are created and stored in FAISS
4. User asks questions (text or voice)
5. System retrieves relevant context
6. LangGraph decides response type:

   * MATHS → explanation + example
   * AGAIN → deeper explanation
   * GENERAL → normal answer
7. LLM generates final response

---

## 🔊 Voice System

* **Speech-to-Text:** Faster-Whisper
* **Text-to-Speech:** Piper

---

## 📌 Future Improvements

* Real-time streaming responses
* Better UI (animations + dark mode)
* Multi-document support
* Deployment (Render / AWS / Docker)
* Authentication system

---

## 👨‍💻 Author

**Ashmit Sutar**
AI/ML Engineering Student

---

