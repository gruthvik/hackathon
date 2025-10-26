const backendUrl = "http://127.0.0.1:5000";
const params = new URLSearchParams(window.location.search);
const username = params.get("username");
const sessionname = params.get("sessionname");

let askButton;
let addToNotesButton;
let notes = []; // To store notes globally if needed later

document.addEventListener("DOMContentLoaded", () => {
  // === DOM ELEMENTS ===
  const input = document.getElementById("userInput");
  const sendButton = document.getElementById("sendButton");
  const messagesDiv = document.getElementById("messages");
  const voiceButton = document.getElementById("voiceInputButton");
  const speakToggle = document.getElementById("speakToggle");
  const viewNotesButton = document.getElementById("viewNotesButton");
  const youtubereferenceButton = document.getElementById("youtubereference");
  let youtubeModal, videoContainer, closeYoutubeModal;
  let showAlternatives = false;
  let currentVideo = null;
  let alternativeVideos = [];
  if (youtubereferenceButton) {
    youtubereferenceButton.addEventListener("click", handleYouTubeReference);
  }

  async function handleYouTubeReference() {
    const lastBotMessage = getLastBotMessage();
    if (!lastBotMessage) {
      alert("No recent bot message found to base the suggestion on.");
      return;
    }

    // Step 1: Extract concept
    const concept = await extractConcept(lastBotMessage);
    if (!concept) {
      alert("Could not extract concept.");
      return;
    }

    // Step 2: Fetch YouTube videos from backend
    const { mainVideo, alternatives } = await searchVideos(concept);
    if (!mainVideo) {
      alert("No videos found for this concept.");
      return;
    }

    currentVideo = mainVideo;
    alternativeVideos = alternatives || [];

    // Step 3: Show modal
    showYouTubeModal();
  }

  function getLastBotMessage() {
    if (!chat || chat.length === 0) return null;
    for (let i = chat.length - 1; i >= 0; i--) {
      if (chat[i].sender && chat[i].sender.toLowerCase() === "bot") {
        return chat[i].message;
      }
    }
    return null;
  }

  async function extractConcept(text) {
    try {
      const res = await fetch(`${backendUrl}/extract-concept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
      const data = await res.json();
      return data.concept;
    } catch (err) {
      console.error("Error extracting concept:", err);
      return null;
    }
  }

  async function searchVideos(query) {
    try {
      const res = await fetch(`${backendUrl}/search-video`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query })
      });
      const data = await res.json();
      return data;
    } catch (err) {
      console.error("Error fetching videos:", err);
      return {};
    }
  }

  function showYouTubeModal() {
    // Create modal only once
    if (!youtubeModal) {
      youtubeModal = document.createElement("div");
      youtubeModal.id = "youtubeModal";
      youtubeModal.style.position = "fixed";
      youtubeModal.style.top = "50%";
      youtubeModal.style.left = "50%";
      youtubeModal.style.transform = "translate(-50%, -50%)";
      youtubeModal.style.background = "#fff";
      youtubeModal.style.border = "1px solid #ccc";
      youtubeModal.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
      youtubeModal.style.zIndex = "1001";
      youtubeModal.style.width = "80%";
      youtubeModal.style.maxWidth = "700px";
      youtubeModal.style.padding = "10px";
      youtubeModal.style.borderRadius = "8px";
      youtubeModal.style.overflowY = "auto";

      // Header
      const header = document.createElement("div");
      header.style.display = "flex";
      header.style.justifyContent = "space-between";
      header.style.alignItems = "center";
      const title = document.createElement("h3");
      title.id = "videoTitle";
      title.textContent = "Related Video";
      header.appendChild(title);

      const btnGroup = document.createElement("div");
      const minimizeBtn = document.createElement("button");
      minimizeBtn.innerText = "🔽";
      minimizeBtn.addEventListener("click", () => {
        videoContainer.style.display = 
          videoContainer.style.display === "none" ? "block" : "none";
        minimizeBtn.innerText = 
          videoContainer.style.display === "none" ? "🔼" : "🔽";
      });

      closeYoutubeModal = document.createElement("button");
      closeYoutubeModal.innerText = "×";
      closeYoutubeModal.style.marginLeft = "8px";
      closeYoutubeModal.addEventListener("click", () => {
        youtubeModal.remove();
        youtubeModal = null;
      });

      btnGroup.appendChild(minimizeBtn);
      btnGroup.appendChild(closeYoutubeModal);
      header.appendChild(btnGroup);

      youtubeModal.appendChild(header);

      videoContainer = document.createElement("div");
      videoContainer.id = "videoContainer";
      youtubeModal.appendChild(videoContainer);

      document.body.appendChild(youtubeModal);
    }

    renderMainVideoView();
  }

  function renderMainVideoView() {
    if (!currentVideo) return;

    // src="https://www.youtube.com/embed/${videoResult.videoId}?enablejsapi=1"
    videoContainer.innerHTML = `
    <div class="video-container" style="text-align:center">
    <iframe width="560" height="315"
        src="https://www.youtube.com/embed/${currentVideo.videoId}?rel=0&modestbranding=1"
          frameborder="0"></iframe>
        <h4>${currentVideo.title}</h4>
      </div>
      <div style="margin-top:10px;text-align:center">
        ${alternativeVideos.length > 0 
          ? `<button id="dontLikeBtn">Don’t like this video? See other options</button>` 
          : ""}
      </div>
    `;

    const dontLikeBtn = document.getElementById("dontLikeBtn");
    if (dontLikeBtn) {
      dontLikeBtn.addEventListener("click", renderAlternativesView);
    }
  }

  function renderAlternativesView() {
    if (!alternativeVideos || alternativeVideos.length === 0) {
      videoContainer.innerHTML = "<p>No alternatives available.</p>";
      return;
    }

    videoContainer.innerHTML = `
      <div style="margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;">
        <h4>Choose an alternative video:</h4>
        <button id="backToMainBtn">Back</button>
      </div>
      ${alternativeVideos.map((v, i) => `
        <div class="alternative-video-item" data-index="${i}" 
            style="display:flex;gap:10px;cursor:pointer;padding:10px;border:1px solid #ddd;border-radius:5px;margin-bottom:5px;">
          <img src="https://img.youtube.com/vi/${v.videoId}/mqdefault.jpg" 
              style="width:120px;height:90px;object-fit:cover;border-radius:4px;" />
          <div>
            <h5 style="margin:0;">Option ${i + 1}: ${v.title}</h5>
            <p style="font-size:0.9em;color:#666;">Click to select this video</p>
          </div>
        </div>
      `).join("")}
    `;

    document.getElementById("backToMainBtn").addEventListener("click", renderMainVideoView);

    document.querySelectorAll(".alternative-video-item").forEach((el) => {
      el.addEventListener("click", () => {
        const index = parseInt(el.dataset.index);
        currentVideo = alternativeVideos[index];
        renderMainVideoView();
      });
    });
  }
  // const youtubeModal = document.getElementById("youtubeModal");
  // const closeYoutubeModal = document.getElementById("closeYoutubeModal");
  // const videoContainer = document.getElementById("videoContainer");
  const webcam = document.getElementById("webcam");

  // === VARIABLES ===
  let chat = {};

  // === EVENT LISTENERS ===
  viewNotesButton.addEventListener("click", handleViewNotes);
  sendButton.addEventListener("click", sendMessage);
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  // === FETCH CHAT HISTORY ===
  getChatHistory();

  async function getChatHistory() {
    try {
      const response = await fetch(`${backendUrl}/getchathistory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username,
          sessionname: sessionname
        }),
      });
      const data = await response.json();
      if (data.history && Array.isArray(data.history)) {
        data.history.forEach(entry => {
          messagesDiv.innerHTML += `<div><b>${entry.sender}:</b> ${formatMessage(entry.message)}</div>`;
        });
        chat = data.history;
      }
    } catch (err) {
      console.error("Error fetching chat history:", err);
    }
  }

  // === YOUTUBE REFERENCE FEATURE ===
  // if (youtubereferenceButton) {
  //   youtubereferenceButton.addEventListener("click", () => {
  //     const lastBotMessage = getLastBotMessage();
  //     if (lastBotMessage) {
  //       suggestYouTubeVideo(lastBotMessage);
  //     } else {
  //       alert("No recent bot message found to base the suggestion on.");
  //     }
  //   });
  // } else {
  //   console.warn("⚠️ YouTube reference button not found in HTML.");
  // }

  // if (youtubeModal && closeYoutubeModal && videoContainer) {
  //   closeYoutubeModal.addEventListener("click", () => {
  //     youtubeModal.style.display = "none";
  //     videoContainer.innerHTML = "";
  //   });
  // } else {
  //   console.warn("⚠️ YouTube modal elements not found.");
  // }

  // function getLastBotMessage() {
  //   if (!chat || chat.length === 0) return null;
  //   for (let i = chat.length - 1; i >= 0; i--) {
  //     if (chat[i].sender && chat[i].sender.toLowerCase() === "bot") {
  //       return chat[i].message;
  //     }
  //   }
  //   return null;
  // }

//   async function suggestYouTubeVideo(botMessage) {
//   const YOUTUBE_API_KEY = "AIzaSyCETIALsyMa9CFJ7Sw0pEvHJbiM-7AYJpQ";
//   const query = await extractKeywords(botMessage);
  
//   const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
//     query
//   )}&type=video&maxResults=5&key=${YOUTUBE_API_KEY}`;

//   try {
//     const response = await fetch(url);
//     const data = await response.json();

//     if (!data.items || data.items.length === 0) {
//       videoContainer.innerHTML = "<p>No relevant videos found.</p>";
//       youtubeModal.style.display = "block";
//       return;
//     }

//     // Get video IDs to check embeddable status
//     const videoIds = data.items.map((v) => v.id.videoId).join(",");
//     const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=status,snippet&id=${videoIds}&key=${YOUTUBE_API_KEY}`;
//     const detailsResponse = await fetch(detailsUrl);
//     const detailsData = await detailsResponse.json();

//     // Filter only embeddable videos
//     const embeddableVideos = detailsData.items.filter(v => v.status.embeddable);

//     if (embeddableVideos.length === 0) {
//       videoContainer.innerHTML = "<p>No embeddable videos found.</p>";
//       youtubeModal.style.display = "block";
//       return;
//     }

//     const video = embeddableVideos[0];
//     const videoId = video.id;
//     const title = video.snippet.title;

//     videoContainer.innerHTML = `
//       <h4>Suggested Video: ${title}</h4>
//       <iframe
//         width="560"
//         height="315"
//         src="https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1"
//         frameborder="0"
//         allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
//         allowfullscreen>
//       </iframe>
//     `;
//     youtubeModal.style.display = "block";

//   } catch (error) {
//     console.error("Error fetching YouTube data:", error);
//     videoContainer.innerHTML = "<p>Error loading video. Try again later.</p>";
//     youtubeModal.style.display = "block";
//   }
// }

// async function extractKeywords(text) {
//   try {
//     const response = await fetch(`${backendUrl}/extract_keywords`, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({ text }), // Send text to backend
//     });

//     const data = await response.json();

//     // Expect backend to return { summary: "A short sentence" }
//     if (data && data.final) {
//     return data.final;
//     } // return sentence explanation
//      else {
//       console.warn("⚠️ No summary found in backend response.");
//       return text; // fallback if backend returns nothing
//     }
//   } catch (err) {
//     console.error("Error extracting summary:", err);
//     return text; // fallback if request fails
//   }
// }

  // === SPEECH RECOGNITION ===
  const recognition = window.SpeechRecognition || window.webkitSpeechRecognition
    ? new (window.SpeechRecognition || window.webkitSpeechRecognition)()
    : null;

  if (recognition) {
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    voiceButton.addEventListener("click", () => {
      recognition.start();
    });

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      input.value = transcript;
      sendMessage();
    };

    recognition.onerror = (event) => {
      alert("Speech recognition error: " + event.error);
    };
  } else {
    voiceButton.disabled = true;
    voiceButton.innerText = "Voice not supported";
  }

  // === TEXT-TO-SPEECH ===
  function speakText(text) {
    if (!speakToggle.checked) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  }

  // === ASK DOUBT & ADD TO NOTES BUTTONS ===
  askButton = document.createElement("button");
  askButton.innerText = "Ask a doubt here!";
  askButton.style.position = "absolute";
  askButton.style.display = "none";
  askButton.style.zIndex = 1000;
  askButton.addEventListener("click", handleAskDoubt);
  document.body.appendChild(askButton);

  addToNotesButton = document.createElement("button");
  addToNotesButton.innerText = "Add to Notes";
  addToNotesButton.style.position = "absolute";
  addToNotesButton.style.display = "none";
  addToNotesButton.style.zIndex = 1000;
  addToNotesButton.addEventListener("click", handleAddToNotes);
  document.body.appendChild(addToNotesButton);

  // === SECOND CHATBOT MODAL ===
  const modal = document.createElement("div");
  modal.id = "chatbotModal";
  modal.style.display = "none";
  modal.style.position = "fixed";
  modal.style.top = "50%";
  modal.style.left = "50%";
  modal.style.transform = "translate(-50%, -50%)";
  modal.style.backgroundColor = "white";
  modal.style.border = "1px solid #ccc";
  modal.style.padding = "20px";
  modal.style.zIndex = 1001;
  modal.style.width = "80%";
  modal.style.maxWidth = "500px";
  modal.style.boxShadow = "0 2px 10px rgba(0,0,0,0.1)";

  const modalMessagesDiv = document.createElement("div");
  modalMessagesDiv.id = "modalMessages";
  modal.appendChild(modalMessagesDiv);

  const modalInput = document.createElement("input");
  modalInput.id = "modalUserInput";
  modalInput.placeholder = "Ask your doubt here...";
  modal.appendChild(modalInput);

  const modalSendButton = document.createElement("button");
  modalSendButton.innerText = "Send";
  modal.appendChild(modalSendButton);

  const closeModalButton = document.createElement("button");
  closeModalButton.innerText = "Close";
  closeModalButton.style.marginTop = "10px";
  modal.appendChild(closeModalButton);

  document.body.appendChild(modal);

  closeModalButton.addEventListener("click", () => {
    modal.style.display = "none";
  });

  modalSendButton.addEventListener("click", async () => {
    const userMessage = modalInput.value.trim();
    if (!userMessage) return;

    modalMessagesDiv.innerHTML += `<div><b>You:</b> ${userMessage}</div>`;
    modalInput.value = "";

    try {
      const response = await fetch(`${backendUrl}/temp_get_response`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, username, sessionname }),
      });

      const data = await response.json();
      const botMessage = data.response || "No reply";
      modalMessagesDiv.innerHTML += `<div><b>Bot:</b> ${formatMessage(botMessage)}</div>`;
      modalMessagesDiv.scrollTop = modalMessagesDiv.scrollHeight;
    } catch (err) {
      modalMessagesDiv.innerHTML += `<div><b>Error:</b> Could not reach server.</div>`;
    }
  });

  // === TEXT SELECTION HANDLERS ===
  document.addEventListener("mouseup", () => {
    const selection = window.getSelection();
    if (selection.toString().trim()) {
      const rect = selection.getRangeAt(0).getBoundingClientRect();
      askButton.style.left = `${rect.left + window.scrollX}px`;
      askButton.style.top = `${rect.bottom + window.scrollY + 5}px`;
      askButton.style.display = "block";
      addToNotesButton.style.left = `${rect.left + window.scrollX + askButton.offsetWidth + 5}px`;
      addToNotesButton.style.top = `${rect.bottom + window.scrollY + 5}px`;
      addToNotesButton.style.display = "block";
    } else {
      askButton.style.display = "none";
      addToNotesButton.style.display = "none";
    }
  });

  document.addEventListener("click", (e) => {
    if (!askButton.contains(e.target) && !window.getSelection().toString().trim()) {
      askButton.style.display = "none";
      addToNotesButton.style.display = "none";
    }
  });

  function handleAskDoubt() {
    const selection = window.getSelection().toString().trim();
    if (selection) {
      modalInput.value = selection;
      modal.style.display = "block";
    }
    askButton.style.display = "none";
  }

  function handleAddToNotes() {
    const selectedText = window.getSelection().toString().trim();
    if (selectedText) {
      notes.push(selectedText);
      console.log("Notes:", notes);
    }
    askButton.style.display = "none";
    addToNotesButton.style.display = "none";
  }
  function formatMessage(input) {
  if (input == null) return "";
  let text = String(input).replace(/\r\n?/g, "\n");

  // helper: escape HTML
  const escapeHtml = (s) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const placeholders = [];
  const addPlaceholder = (html) => {
    const idx = placeholders.push(html) - 1;
    return `@@HTML_PLACEHOLDER_${idx}@@`;
  };

  // 1) Extract fenced code blocks ```lang\n...\n``` -> keep as placeholder with escaped inner text
  text = text.replace(/```(\w+)?\n([\s\S]*?)```/g, (m, lang, code) => {
    const esc = escapeHtml(code);
    const langAttr = lang ? ` class="language-${lang}"` : "";
    return addPlaceholder(`<pre><code${langAttr}>${esc}</code></pre>`);
  });

  // 2) Extract inline code `...` (avoid matching ticks across lines)
  text = text.replace(/`([^`\n]+)`/g, (m, code) =>
    addPlaceholder(`<code>${escapeHtml(code)}</code>`)
  );

  // 3) Escape remaining HTML in the rest of the text (safe now)
  text = escapeHtml(text);

  // 4) Headings
  text = text.replace(/^###### (.*)$/gm, "<h6>$1</h6>");
  text = text.replace(/^##### (.*)$/gm, "<h5>$1</h5>");
  text = text.replace(/^#### (.*)$/gm, "<h4>$1</h4>");
  text = text.replace(/^### (.*)$/gm, "<h3>$1</h3>");
  text = text.replace(/^## (.*)$/gm, "<h2>$1</h2>");
  text = text.replace(/^# (.*)$/gm, "<h1>$1</h1>");

  // 5) Blockquotes (single-line). Note we escaped '>' -> '&gt;'
  text = text.replace(/(^|\n)&gt;\s?(.*?)(?=\n|$)/g, "$1<blockquote>$2</blockquote>");

  // 6) Ordered lists: convert consecutive "1. item" lines into one <ol>
  text = text.replace(/(^|\n)((?:\s*\d+\.\s+.*(?:\n|$))+)/g, (m, prefix, group) => {
    const items = group
      .trim()
      .split(/\n/)
      .filter(Boolean)
      .map((line) => line.replace(/^\s*\d+\.\s+/, "").trim());
    return prefix + "<ol>" + items.map((it) => `<li>${it}</li>`).join("") + "</ol>";
  });

  // 7) Unordered lists: convert consecutive "- item" or "* item" lines into one <ul>
  text = text.replace(/(^|\n)((?:\s*[-*]\s+.*(?:\n|$))+)/g, (m, prefix, group) => {
    const items = group
      .trim()
      .split(/\n/)
      .filter(Boolean)
      .map((line) => line.replace(/^\s*[-*]\s+/, "").trim());
    return prefix + "<ul>" + items.map((it) => `<li>${it}</li>`).join("") + "</ul>";
  });

  // 8) Bold then italic (order matters)
  text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // italic: single * ... * but not ** ... **
  text = text.replace(/(^|[^*])\*(?!\*)([^*]+?)\*(?=[^*]|$)/g, "$1<em>$2</em>");

  // 9) URLs -> clickable links
  text = text.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  // 10) Convert remaining single newlines into <br>
  text = text.replace(/\n/g, "<br>");

  // 11) Restore placeholders (code blocks and inline code)
  placeholders.forEach((html, i) => {
    const token = `@@HTML_PLACEHOLDER_${i}@@`;
    text = text.split(token).join(html);
  });

  return text;
}
  // === VIEW NOTES MODAL ===
  function handleViewNotes() {
    const notesModal = document.createElement("div");
    notesModal.id = "notesModal";
    notesModal.style.position = "fixed";
    notesModal.style.top = "50%";
    notesModal.style.left = "50%";
    notesModal.style.transform = "translate(-50%, -50%)";
    notesModal.style.backgroundColor = "white";
    notesModal.style.border = "1px solid #ccc";
    notesModal.style.padding = "20px";
    notesModal.style.zIndex = 1001;
    notesModal.style.width = "80%";
    notesModal.style.maxWidth = "500px";
    notesModal.style.boxShadow = "0 2px 10px rgba(0,0,0,0.1)";

    const closeNotesButton = document.createElement("button");
    closeNotesButton.innerText = "Close";
    closeNotesButton.style.marginTop = "10px";
    closeNotesButton.addEventListener("click", () => {
      document.body.removeChild(notesModal);
    });
    notesModal.appendChild(closeNotesButton);

    const notesList = document.createElement("div");
    notesList.style.marginTop = "10px";
    if (notes.length === 0) {
      notesList.innerText = "No notes available.";
    } else {
      notes.forEach((note, index) => {
        const noteDiv = document.createElement("div");
        noteDiv.innerText = `${index + 1}. ${note}`;
        notesList.appendChild(noteDiv);
      });
    }
    notesModal.appendChild(notesList);

    document.body.appendChild(notesModal);
  }

  // === MAIN CHAT SEND FUNCTION ===
  async function sendMessage() {
    const userMessage = input.value.trim();
    if (!userMessage) return;

    messagesDiv.innerHTML += `<div><b>You:</b> ${userMessage}</div>`;
    input.value = "";

    try {
      const response = await fetch(`${backendUrl}/get_response`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, username, sessionname }),
      });

      const data = await response.json();
      const botMessage = data.response || "No reply";
      messagesDiv.innerHTML += `<div><b>Bot:</b> ${botMessage}</div>`;
      messagesDiv.scrollTop = messagesDiv.scrollHeight;

      speakText(botMessage);
    } catch (err) {
      messagesDiv.innerHTML += `<div><b>Error:</b> Could not reach server.</div>`;
    }
  }

  // === EMOTION DETECTION ===
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
      webcam.srcObject = stream;

      webcam.onloadedmetadata = () => {
        canvas.width = webcam.videoWidth;
        canvas.height = webcam.videoHeight;

        setInterval(captureAndSend, 1000);
      };
    })
    .catch(error => {
      console.error("Error accessing webcam", error);
    });

  function captureAndSend() {
    if (webcam.videoWidth === 0 || webcam.videoHeight === 0) {
      console.log("Camera not ready yet...");
      return;
    }

    context.drawImage(webcam, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL("image/jpeg");

    fetch(`${backendUrl}/analyze_emotion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: imageData })
    })
      .then(response => response.json())
      .then(data => {
        console.log("Detected Emotion:", data.emotion);
      })
      .catch(error => {
        console.error("Error detecting emotion", error);
      });
  }
});
