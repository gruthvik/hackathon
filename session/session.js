const backendUrl = "http://127.0.0.1:5000";
const params = new URLSearchParams(window.location.search);
const username = params.get("username");
const sessionname = params.get("sessionname");

// ---------------------------
// Elements
// ---------------------------
const modal = document.getElementById("sessionModal");
const openBtn = document.getElementById("newSessionBtn");
const closeBtn = document.querySelector(".close");
const createBtn = document.getElementById("createSession");
const sessionList = document.getElementById("sessionList");

let sessions = [];

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
    // Add click event to navigate to chatbot with session
    card.onclick = () => {
      window.location.href = `../chatbot/chatbot.html?username=${username}&sessionname=${encodeURIComponent(s.title)}`;
    };
    sessionList.appendChild(card);
  });
}


// Initial render
// renderSessions();

async function loadSessions() {
  try {
    const response = await fetch(`${backendUrl}/get_sessions?username=${encodeURIComponent(username)}`);
    if (!response.ok) throw new Error("Failed to fetch sessions");

    const data = await response.json();
    sessions = data.map(s => ({
      title: s.sessionname,
      mode: s.sessiontype,
      portion: s.portion || "",
      created_at: s.created_at
    }));

    renderSessions();
  } catch (err) {
    console.error("❌ Error fetching sessions:", err);
  }
}
loadSessions();

// ---------------------------
// Handle new session creation
// ---------------------------
createBtn.onclick = async () => {
  const sessionname = document.getElementById("sessionName").value.trim();
  const mode = document.getElementById("studyMode").value;
  const file = document.getElementById("pdfUpload").files[0];
  
  if (!sessionname) {
    alert("Please enter a session name!");
    return;
  }

  try {
    let fullText = "";
    
    // Read PDF if file is provided
    if (file) {
      const arrayBuffer = await file.arrayBuffer();
      // Extract full text using pdf.js
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(" ");
        fullText += pageText + "\n";
      }
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
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Upload failed");
    }
    
    const result = await response.json();
    
    // Update session list dynamically
    sessions.unshift({
      title: sessionname,
      mode: mode,
      thumbnail: "https://via.placeholder.com/300x180?text=New+Session"
    });

    renderSessions();
    modal.style.display = "none";
    document.getElementById("sessionName").value = "";
    document.getElementById("pdfUpload").value = "";
    
    // Navigate to chatbot with new session
    window.location.href = `../chatbot/chatbot.html?username=${username}&sessionname=${encodeURIComponent(sessionname)}`;
    
  } catch (err) {
    console.error("❌ Error creating session:", err);
    alert(`Failed to create session: ${err.message}`);
  }
};