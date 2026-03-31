let uploadedFile = null;

// -------- UPLOAD PDF --------
async function uploadPDF() {
    const fileInput = document.getElementById("pdf-upload");
    const file = fileInput.files[0];

    if (!file) return alert("Select PDF");

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/upload", {
        method: "POST",
        body: formData
    });

    const data = await res.json();
    uploadedFile = data.filename;

    await fetch("/process_pdf", {
        method: "POST",
        body: new URLSearchParams({
            filename: uploadedFile
        })
    });

    loadPDF(`/uploads/${uploadedFile}`);
}

// -------- LOAD PDF --------
async function loadPDF(url) {
    const pdf = await pdfjsLib.getDocument(url).promise;
    const container = document.getElementById("pdf-container");
    container.innerHTML = "";

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        const viewport = page.getViewport({ scale: 1.2 });

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;

        container.appendChild(canvas);
    }
}

// -------- TEXT CHAT --------
async function sendMessage() {
    const input = document.getElementById("user-input");
    const message = input.value;

    if (!message) return;

    addMessage(message, "user");

    const res = await fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            message: message,
            thread_id: "default"
        })
    });

    const data = await res.json();
    addMessage(data.response, "ai");

    input.value = "";
}

// -------- ADD MESSAGE --------
function addMessage(text, type) {
    const chatBox = document.getElementById("chat-box");

    const div = document.createElement("div");
    div.className = "message " + type;
    div.innerText = text;

    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// -------- VOICE --------
let mediaRecorder;
let audioChunks = [];

const micBtn = document.getElementById("micBtn");

micBtn.addEventListener("click", async () => {

    if (!mediaRecorder || mediaRecorder.state === "inactive") {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.start();
        micBtn.classList.add("recording");

        mediaRecorder.ondataavailable = event => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
            micBtn.classList.remove("recording");

            const audioBlob = new Blob(audioChunks, { type: "audio/wav" });

            const formData = new FormData();
            formData.append("file", audioBlob, "audio.wav");

            const res = await fetch("/voice-chat", {
                method: "POST",
                body: formData
            });

            const data = await res.json();

            if (data.error) {
                alert(data.error);
                return;
            }

            addMessage(data.user_text, "user");
            addMessage(data.ai_text, "ai");
        };

    } else {
        mediaRecorder.stop();
    }
});