const backendUrl="http://127.0.0.1:5000";
const params = new URLSearchParams(window.location.search);
const username = params.get("username");
// ---------------------------
// Elements
// ---------------------------
const modal = document.getElementById("sessionModal");
const openBtn = document.getElementById("newSessionBtn");
const closeBtn = document.querySelector(".close");
const createBtn = document.getElementById("createSession");
const sessionList = document.getElementById("sessionList");

// ---------------------------
// Initial sample sessions
// ---------------------------
let sessions = [
  { title: "AI Speedrun", mode: "Speedrun", thumbnail: "https://img.youtube.com/vi/Vy1JwiXHwI4/hqdefault.jpg" },
  { title: "Operating Systems Normal", mode: "Normal", thumbnail: "https://img.youtube.com/vi/0NJDn0qzG3I/hqdefault.jpg" },
  { title: "Data Science Detailed", mode: "Detailed", thumbnail: "https://img.youtube.com/vi/ua-CiDNNj30/hqdefault.jpg" }
];

// ---------------------------
// Open / Close Modal
// ---------------------------
openBtn.onclick = () => modal.style.display = "flex";
closeBtn.onclick = () => modal.style.display = "none";
window.onclick = e => { if (e.target === modal) modal.style.display = "none"; };

// ---------------------------
// Render session cards
// ---------------------------
function renderSessions() {
  sessionList.innerHTML = "";
  sessions.forEach(s => {
    const card = document.createElement("div");
    card.className = "session-card";
    card.innerHTML = `
      <div class="session-thumbnail" style="background-image:url('${s.thumbnail}')"></div>
      <div class="session-info">
        <h3>${s.title}</h3>
        <p>Mode: ${s.mode}</p>
      </div>
    `;
    sessionList.appendChild(card);
  });
}

// Initial render
renderSessions();

// ---------------------------
// Handle new session creation
// ---------------------------
createBtn.onclick = async () => {
  const sessionname = document.getElementById("sessionName").value.trim();
  const mode = document.getElementById("studyMode").value;
  const file = document.getElementById("pdfUpload").files[0];
  // if (!file) return alert("Please upload a file!");

  try {
    // Read PDF as ArrayBuffer

    if (file){
      const arrayBuffer = await file.arrayBuffer();
    // Extract full text using pdf.js
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(" ");
      fullText += pageText + "\n";
    }
    }else{
    pdf=null;
    fullText="";
  }

    // Send data to backend
    const response = await fetch(`${backendUrl}/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: username,
        sessionname: sessionname,
        text: fullText,
        mode: mode,
      })
    });
    
    if (!response.ok) throw new Error("Upload failed or server error.");
    const result = await response.json();
    
    // Update session list dynamically
    sessions.unshift({
      title: result.file_name || file.name.replace(/\.[^/.]+$/, ""),
      mode: result.mode || mode,
    });

    renderSessions();
    modal.style.display = "none";
    document.getElementById("pdfUpload").value = "";
    window.location.href = `../chatbot/chatbot.html?username=${username}`;
  } catch (err) {
    console.error("❌ Error creating session:", err);
    alert("Failed to create session. Check console for details.");
  }
};
