let uploadedFile = null;

// -------- UPLOAD PDF --------
async function uploadPDF() {
    const fileInput = document.getElementById("pdf-upload");
    const file = fileInput.files[0];

    if (!file) return alert("Select PDF");

    const formData = new FormData();
    formData.append("file", file);

    const uploadBtn = fileInput.nextElementSibling;
    const ogText = uploadBtn.innerText;
    uploadBtn.innerText = "Uploading...";
    uploadBtn.disabled = true;

    try {
        const res = await fetch("/upload", {
            method: "POST",
            body: formData
        });

        const data = await res.json();
        uploadedFile = data.filename;

        uploadBtn.innerText = "Processing...";

        await fetch("/process_pdf", {
            method: "POST",
            body: new URLSearchParams({
                filename: uploadedFile
            })
        });

        uploadBtn.innerText = "Loaded!";
        setTimeout(() => { uploadBtn.innerText = ogText; uploadBtn.disabled = false; }, 2000);

        loadPDF(`/uploads/${uploadedFile}`);
    } catch(err) {
        console.error("Upload error", err);
        uploadBtn.innerText = "Error";
        uploadBtn.disabled = false;
    }
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

// -------- TTS (Text-to-Speech) Web Speech API --------
function speakText(text) {
    if ('speechSynthesis' in window) {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Optional configuration
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        // Try to pick a natural sounding voice if available
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
            // Find a Google UK English Male/Female or standard OS voice
            const preferredVoice = voices.find(v => v.name.includes("Google") || v.name.includes("Premium"));
            if (preferredVoice) {
                utterance.voice = preferredVoice;
            }
        }
        
        window.speechSynthesis.speak(utterance);
    } else {
        console.warn("Text-to-speech not supported in this browser.");
    }
}

// Ensure voices are loaded ahead of time if possible
if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
    };
}


// -------- TEXT CHAT --------
async function sendMessage() {
    const input = document.getElementById("user-input");
    const message = input.value;

    if (!message) return;

    addMessage(message, "user");
    input.value = "";

    try {
        const res = await fetch("/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: message,
                thread_id: "default"
            })
        });

        const data = await res.json();
        const responseText = data.response || "No response text found.";
        
        addMessage(responseText, "ai");
        
        // --- TEXT TO SPEECH ---
        speakText(responseText);

    } catch (err) {
        console.error("Chat error", err);
        addMessage("Sorry, an error occurred.", "ai");
    }
}

// Enter key to send message & URL Param Loader
document.addEventListener("DOMContentLoaded", () => {
    const userInput = document.getElementById("user-input");
    if(userInput) {
        userInput.addEventListener("keypress", function(event) {
            if (event.key === "Enter") {
                event.preventDefault();
                sendMessage();
            }
        });
    }

    const params = new URLSearchParams(window.location.search);
    const autoloaderFile = params.get('file');
    if(autoloaderFile) {
        const container = document.getElementById("pdf-container");
        if(container) {
            const uploadBtn = document.querySelector(".pdf-section button");
            if(uploadBtn) {
                uploadBtn.innerText = "Loading " + autoloaderFile + "...";
                uploadBtn.disabled = true;
            }
            
            fetch("/process_pdf", {
                method: "POST",
                body: new URLSearchParams({
                    filename: autoloaderFile
                })
            }).then(() => {
                loadPDF(`/uploads/${autoloaderFile}`);
                uploadedFile = autoloaderFile;
                if(uploadBtn) {
                    uploadBtn.innerText = "Loaded!";
                    setTimeout(() => { uploadBtn.innerText = "Upload"; uploadBtn.disabled = false; }, 2000);
                }
            }).catch(console.error);
        }
    }
});

// -------- LOAD PAPERS DASHBOARD --------
async function loadPapersList() {
    const grid = document.getElementById("papers-grid");
    if (!grid) return;
    
    grid.innerHTML = "<p>Loading papers...</p>";
    
    try {
        const res = await fetch("/list-papers");
        const data = await res.json();
        
        grid.innerHTML = "";
        
        if (data.papers.length === 0) {
            grid.innerHTML = "<p>No papers uploaded yet.</p>";
            return;
        }
        
        data.papers.forEach(fileName => {
            const card = document.createElement("div");
            card.className = "paper-card";
            
            const title = document.createElement("div");
            title.className = "title";
            title.innerText = fileName;
            
            const icon = document.createElement("div");
            icon.className = "icon";
            icon.innerText = "📄";
            
            const btn = document.createElement("button");
            btn.innerText = "Study";
            btn.onclick = () => {
                window.location.href = `/study?file=${encodeURIComponent(fileName)}`;
            };
            
            card.appendChild(icon);
            card.appendChild(title);
            card.appendChild(btn);
            
            grid.appendChild(card);
        });
        
    } catch(err) {
        grid.innerHTML = "<p>Error loading papers.</p>";
        console.error(err);
    }
}


// -------- ADD MESSAGE --------
function addMessage(text, type) {
    const chatBox = document.getElementById("chat-box");
    
    if(!chatBox) return;

    const div = document.createElement("div");
    div.className = "message " + type;
    div.innerText = text;

    chatBox.appendChild(div);
    
    // Smooth scroll to bottom
    chatBox.scrollTo({
        top: chatBox.scrollHeight,
        behavior: 'smooth'
    });
}

// -------- VOICE --------
let mediaRecorder;
let audioChunks = [];

const micBtn = document.getElementById("micBtn");

if (micBtn) {
    micBtn.addEventListener("click", async () => {

        // Stop recording
        if (mediaRecorder && mediaRecorder.state === "recording") {
            mediaRecorder.stop();
            return;
        }

        // Start recording
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            mediaRecorder.start();
            micBtn.classList.add("recording");
            
            // Pulsing effect handled by CSS .recording class

            mediaRecorder.ondataavailable = event => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                micBtn.classList.remove("recording");
                
                // Keep tracks clean
                stream.getTracks().forEach(track => track.stop());

                const audioBlob = new Blob(audioChunks, { type: "audio/wav" });

                const formData = new FormData();
                formData.append("file", audioBlob, "audio.wav");

                // Add a temporary loading message for better UX
                const loadingId = "loadingMsg-" + Date.now();
                addLoadingMessage("Processing voice...", loadingId);

                try {
                    const res = await fetch("/voice-chat", {
                        method: "POST",
                        body: formData
                    });

                    const data = await res.json();
                    
                    removeMessage(loadingId);

                    if (data.error) {
                        alert(data.error);
                        return;
                    }

                    addMessage(data.user_text, "user");
                    addMessage(data.ai_text, "ai");
                    
                    // --- TEXT TO SPEECH ---
                    speakText(data.ai_text);

                } catch(err) {
                    removeMessage(loadingId);
                    console.error("Voice chat error", err);
                    alert("Voice chat processing failed.");
                }
            };
        } catch(err) {
            console.error("Microphone access error", err);
            alert("Could not access microphone.");
        }
    });
}

function addLoadingMessage(text, id) {
    const chatBox = document.getElementById("chat-box");
    if(!chatBox) return;

    const div = document.createElement("div");
    div.className = "message ai loading";
    div.id = id;
    div.innerText = text;
    // adding a temporary pulsing animation
    div.style.animation = "pulse 1.5s infinite";

    chatBox.appendChild(div);
    chatBox.scrollTo({
        top: chatBox.scrollHeight,
        behavior: 'smooth'
    });
}

function removeMessage(id) {
    const el = document.getElementById(id);
    if(el) el.remove();
}

// -------- TRENDING API LOGIC --------
async function loadTrending(category, btnElement) {
    // Handle active tab button styling
    if (btnElement) {
        document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        btnElement.classList.add('active');
    }

    const container = document.getElementById("trending-container");
    if (!container) return;

    container.innerHTML = `<p>Loading top ${category} papers...</p>`;

    try {
        const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(category)}&limit=10&fields=title,authors,year,citationCount,url`;
        const response = await fetch(url);
        const data = await response.json();

        container.innerHTML = "";

        if (!data.data || data.data.length === 0) {
            container.innerHTML = `<p>No trending papers found for ${category}.</p>`;
            return;
        }

        data.data.forEach(paper => {
            const card = document.createElement("div");
            card.className = "trending-card";

            let authorsStr = "Unknown Authors";
            if(paper.authors && paper.authors.length > 0) {
                authorsStr = paper.authors.map(a => a.name).join(", ");
                if(authorsStr.length > 60) authorsStr = authorsStr.substring(0, 57) + "...";
            }

            const year = paper.year || "N/A";
            const citations = paper.citationCount !== undefined ? paper.citationCount : "0";
            const paperUrl = paper.url || "#";

            card.innerHTML = `
                <div>
                    <h3>${paper.title}</h3>
                    <div class="authors">${authorsStr}</div>
                </div>
                <div>
                    <div class="meta">
                        <span>📅 ${year}</span>
                        <span>⭐ ${citations} Citations</span>
                    </div>
                    <a href="${paperUrl}" target="_blank" style="text-decoration:none;">
                        <button>Read on Semantic Scholar</button>
                    </a>
                </div>
            `;
            container.appendChild(card);
        });

    } catch (err) {
        console.error("Trending Error:", err);
        container.innerHTML = `<p>Error loading trending papers. Please try again later.</p>`;
    }
}