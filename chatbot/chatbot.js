const backendUrl="http://127.0.0.1:5000";
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

  let chat={};
  chat=getchathistory();
  async function getchathistory(){
    try{
      const response = await fetch(`${backendUrl}/getchathistory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username,
          sessionname: sessionname
        }),
      });
      const data = await response.json();
      if (data.history && Array.isArray(data.history)) {
        data.history.forEach(entry => {
          messagesDiv.innerHTML += `<div><b>${entry.sender}:</b> ${entry.message}</div>`;
        });
        return data.history;
      }
    }catch(err){
      console.error('Error fetching chat history:', err);
    }
  }




  sendButton.addEventListener("click", sendMessage);
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
  });



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


  // 🔊 Text-to-Speech
  function speakText(text) {
    if (!speakToggle.checked) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  }

  // Create button element and append it to the body
  const askButton = document.createElement("button");
  askButton.innerText = "Ask a doubt here!";
  askButton.style.position = "absolute";
  askButton.style.display = "none";  // Initially hidden
  askButton.style.zIndex = 1000;  // Make sure it's on top
  askButton.addEventListener("click", handleAskDoubt);
  document.body.appendChild(askButton);

  const addToNotesButton = document.createElement("button");
  addToNotesButton.innerText = "Add to Notes";
  addToNotesButton.style.position = "absolute";
  addToNotesButton.style.display = "none";  // Initially hidden
  addToNotesButton.style.zIndex = 1000;  // Ensure it's above other content
  addToNotesButton.addEventListener("click", handleAddToNotes);
  document.body.appendChild(addToNotesButton);

  function handleViewNotes() {
    // Create a modal or a simple div to show the notes
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

    // Add a close button
    const closeNotesButton = document.createElement("button");
    closeNotesButton.innerText = "Close";
    closeNotesButton.style.marginTop = "10px";
    closeNotesButton.addEventListener("click", () => {
      document.body.removeChild(notesModal);  // Remove modal when closed
    });
    notesModal.appendChild(closeNotesButton);

    // Display the notes
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

    document.body.appendChild(notesModal);  // Append modal to body
  }



  // Create the modal for the second chatbot
  const modal = document.createElement("div");
  modal.id = "chatbotModal";
  modal.style.display = "none"; // Initially hidden
  modal.style.position = "fixed";
  modal.style.top = "50%";
  modal.style.left = "50%";
  modal.style.transform = "translate(-50%, -50%)";
  modal.style.backgroundColor = "white";
  modal.style.border = "1px solid #ccc";
  modal.style.padding = "20px";
  modal.style.zIndex = 1001; // Ensure it's above other content
  modal.style.width = "80%";
  modal.style.maxWidth = "500px";
  modal.style.boxShadow = "0 2px 10px rgba(0,0,0,0.1)";
  
  // Inside the modal, we'll have a second chatbot input and button
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
        body: JSON.stringify({ message: userMessage, username: username,sessionname: sessionname }),
      });

      const data = await response.json();
      const botMessage = data.response || "No reply";
      modalMessagesDiv.innerHTML += `<div><b>Bot:</b> ${botMessage}</div>`;
      modalMessagesDiv.scrollTop = modalMessagesDiv.scrollHeight;
    } catch (err) {
      modalMessagesDiv.innerHTML += `<div><b>Error:</b> Could not reach server.</div>`;
    }
  });

  // Function to handle text selection
  document.addEventListener("mouseup", () => {
    const selection = window.getSelection();
    if (selection.toString().trim()) {  // If there is selected text
      const rect = selection.getRangeAt(0).getBoundingClientRect();
      // Position the button where the selection was made
      askButton.style.left = `${rect.left + window.scrollX}px`;
      askButton.style.top = `${rect.bottom + window.scrollY + 5}px`; // Add a small gap
      askButton.style.display = "block";  // Show the button
      addToNotesButton.style.left = `${rect.left + window.scrollX + askButton.offsetWidth + 5}px`;
      addToNotesButton.style.top = `${rect.bottom + window.scrollY + 5}px`; // Align it with Ask button
      addToNotesButton.style.display = "block";  // Show the Add to Notes button
    } else {
      askButton.style.display = "none";  // Hide the button if no text is selected
      addToNotesButton.style.display="none";
    }
  });

  // Hide the button if the user clicks anywhere else
  document.addEventListener("click", (e) => {
    if (!askButton.contains(e.target) && !window.getSelection().toString().trim()) {
      askButton.style.display = "none";  // Hide button if clicked outside
      addToNotesButton.style.display="none";
    }
  });

  // Handle when the user clicks the "Ask a doubt here!" button
  function handleAskDoubt() {
    const selection = window.getSelection().toString().trim();
    if (selection) {
      const modalInput = document.getElementById("modalUserInput");
      modalInput.value = selection;  // Populate the input field with the selected text
      modal.style.display = "block"; // Show the modal
    }
    askButton.style.display = "none"; // Hide the button after click
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
        body: JSON.stringify({ 
          message: userMessage,
          username: username,
          sessionname: sessionname
         }),
      });

      const data = await response.json();
      const botMessage = data.response || "No reply";
      messagesDiv.innerHTML += `<div><b>Bot:</b> ${botMessage}</div>`;
      messagesDiv.scrollTop = messagesDiv.scrollHeight;

      // 🔊 Speak the bot response
      speakText(botMessage);
    } catch (err) {
      messagesDiv.innerHTML += `<div><b>Error:</b> Could not reach server.</div>`;
    }
  }

  let notes = [];  // Array to store notes

  function handleAddToNotes() {
    const selectedText = window.getSelection().toString().trim();
    if (selectedText) {
      notes.push(selectedText);  // Add the selected text to notes
      
      // Optionally, you can log the notes to the console
      console.log("Notes: ", notes);
    }
    askButton.style.display = "none";  // Hide the button after click
    addToNotesButton.style.display = "none";  // Hide Add to Notes button
  }
    const webcam = document.getElementById('webcam');
  // const emotionText = document.getElementById('emotion');

  // Create canvas only once
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  // Access webcam
  navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
          webcam.srcObject = stream;

          webcam.onloadedmetadata = () => {
              canvas.width = webcam.videoWidth;
              canvas.height = webcam.videoHeight;

              // Start sending frames only after camera is ready
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

      // Capture frame without affecting layout
      context.drawImage(webcam, 0, 0, canvas.width, canvas.height);
      const imageData = canvas.toDataURL('image/jpeg');

      fetch(`${backendUrl}/analyze_emotion`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json'
          },
          body: JSON.stringify({ image: imageData })
      })
      .then(response => response.json())
      .then(data => {
          // emotionText.textContent = `Detected Emotion: ${data.emotion}`;
          console.log("Detected Emotion:", data.emotion);
      })
      .catch(error => {
          console.error("Error detecting emotion", error);
      });
  }
});


