const backendUrl = "http://127.0.0.1:5000";
const params = new URLSearchParams(window.location.search);
const username = params.get("username");
const sessionname = params.get("sessionname");

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("userInput");
  const sendButton = document.getElementById("sendButton");
  const messagesDiv = document.getElementById("messages");
  const voiceButton = document.getElementById("voiceInputButton");
  const speakToggle = document.getElementById("speakToggle");
  const viewNotesButton = document.getElementById("viewNotesButton");
  viewNotesButton.addEventListener("click", handleViewNotes);

  let chat = {};
  chat = getchathistory();
  async function getchathistory() {
    try {
      const response = await fetch(`${backendUrl}/getchathistory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username,
          sessionname: sessionname,
        }),
      });
      const data = await response.json();
      if (data.history && Array.isArray(data.history)) {
        data.history.forEach((entry) => {
          messagesDiv.innerHTML += `<div><b>${entry.sender}:</b> ${entry.message}</div>`;
        });
        return data.history;
      }
    } catch (err) {
      console.error("Error fetching chat history:", err);
    }
  }

  sendButton.addEventListener("click", sendMessage);
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  const recognition =
    window.SpeechRecognition || window.webkitSpeechRecognition
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

  // 🔊 Text-to-Speech
  function speakText(text) {
    if (!speakToggle.checked) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  }

  // Create Ask Doubt & Notes buttons
  const askButton = document.createElement("button");
  askButton.innerText = "Ask a doubt here!";
  askButton.style.position = "absolute";
  askButton.style.display = "none";
  askButton.style.zIndex = 1000;
  askButton.addEventListener("click", handleAskDoubt);
  document.body.appendChild(askButton);

  const addToNotesButton = document.createElement("button");
  addToNotesButton.innerText = "Add to Notes";
  addToNotesButton.style.position = "absolute";
  addToNotesButton.style.display = "none";
  addToNotesButton.style.zIndex = 1000;
  addToNotesButton.addEventListener("click", handleAddToNotes);
  document.body.appendChild(addToNotesButton);

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

  // Modal chatbot
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
      modalMessagesDiv.innerHTML += `<div><b>Bot:</b> ${botMessage}</div>`;
      modalMessagesDiv.scrollTop = modalMessagesDiv.scrollHeight;
    } catch {
      modalMessagesDiv.innerHTML += `<div><b>Error:</b> Could not reach server.</div>`;
    }
  });

  // Text selection buttons
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
      const modalInput = document.getElementById("modalUserInput");
      modalInput.value = selection;
      modal.style.display = "block";
    }
    askButton.style.display = "none";
  }

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
      appendBotMessage(botMessage);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
      speakText(botMessage);
    } catch {
      messagesDiv.innerHTML += `<div><b>Error:</b> Could not reach server.</div>`;
    }
  }
  

  let notes = [];
  function handleAddToNotes() {
    const selectedText = window.getSelection().toString().trim();
    if (selectedText) {
      notes.push(selectedText);
      console.log("Notes:", notes);
    }
    askButton.style.display = "none";
    addToNotesButton.style.display = "none";
  }

  const webcam = document.getElementById("webcam");
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  navigator.mediaDevices
    .getUserMedia({ video: true })
    .then((stream) => {
      webcam.srcObject = stream;
      webcam.onloadedmetadata = () => {
        canvas.width = webcam.videoWidth;
        canvas.height = webcam.videoHeight;
        setInterval(captureAndSend, 1000);
      };
    })
    .catch((error) => console.error("Error accessing webcam", error));

  function captureAndSend() {
    if (webcam.videoWidth === 0 || webcam.videoHeight === 0) return;
    context.drawImage(webcam, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL("image/jpeg");

    fetch(`${backendUrl}/analyze_emotion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: imageData }),
    })
      .then((res) => res.json())
      .then((data) => console.log("Detected Emotion:", data.emotion))
      .catch((err) => console.error("Error detecting emotion", err));
  }

  // ✅ Progress Button Feature
  function appendBotMessage(botMessage) {
    const msgDiv = document.createElement("div");
    msgDiv.className = "bot";
    msgDiv.innerHTML = `<b>Bot:</b> ${botMessage}`;
    messagesDiv.appendChild(msgDiv);

    if (botMessage.includes("portion created")) {
      const jsonMatch = botMessage.match(/```json([\s\S]*?)```/);
      if (jsonMatch) {
        try {
          const jsonText = jsonMatch[1].trim().replace(/""/g, '"');
          window.currentPortion = JSON.parse(jsonText);
          showProgressButton();
        } catch (err) {
          console.error("❌ JSON parsing failed:", err);
        }
      }
    }
  }

  function showProgressButton() {
    let progressBtn = document.getElementById("progressButton");
    if (!progressBtn) {
      progressBtn = document.createElement("button");
      progressBtn.id = "progressButton";
      progressBtn.innerText = "View Progress";
      progressBtn.style.marginTop = "10px";
      progressBtn.addEventListener("click", () => {
        alert("Progress Data:\n" + JSON.stringify(window.currentPortion, null, 2));
      });
      messagesDiv.appendChild(progressBtn);
    }
  }
});
