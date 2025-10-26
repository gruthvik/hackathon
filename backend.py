from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS

import requests
from deepface import DeepFace
from io import BytesIO
import base64
import numpy as np
from PIL import Image

import google.generativeai as genai

# --- Configure Gemini ---
genai.configure(api_key="AIzaSyDL_LLEZimQKqUbPjH7AtV8somDcS4yYkE")

generation_config = {
    "temperature": 1,
    "top_p": 0.95,
    "top_k": 40,
    "max_output_tokens": 8192,
    "response_mime_type": "text/plain",
}

# app = Flask(__name__)
app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app, resources={r"/*": {"origins": "*"}})

app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:2006@localhost/SamaVeda'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)


# API_KEY = "AIzaSyB-oPqilevRwC9S8sRXAOepx7BkKMakdHw"
API_KEY = "AIzaSyDL_LLEZimQKqUbPjH7AtV8somDcS4yYkE"
API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={API_KEY}"

# User table model
class User(db.Model):
    __tablename__ = 'user'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    iq = db.Column(db.Integer, nullable=True)
    age = db.Column(db.Integer, nullable=False)
    sex = db.Column(db.String(10), nullable=False)
    occupation = db.Column(db.String(100), nullable=False)
    fname = db.Column(db.String(20), nullable=False)
    lname = db.Column(db.String(20), nullable=True)
    about = db.Column(db.Text, nullable=True)

class Session(db.Model):
    __tablename__ = 'session'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), db.ForeignKey('user.username'), nullable=False)
    sessionname = db.Column(db.String(100), nullable=False)
    sessiontype = db.Column(db.String(20), nullable=False)
    portion = db.Column(db.Text, nullable=True)
    customnotes = db.Column(db.Text, nullable=True)
    autonotes = db.Column(db.Text, nullable=True)
    session_created_at = db.Column(db.DateTime(timezone=False), server_default=db.func.now())
    __table_args__ = (
        db.UniqueConstraint('username', 'sessionname', name='unique_username_sessionname'),
    )

class Chat(db.Model):
    __tablename__ = 'chat'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), db.ForeignKey('user.username'), nullable=False)
    sessionname = db.Column(db.String(100), db.ForeignKey('session.sessionname'), nullable=False)
    user_message = db.Column(db.Text, nullable=False)
    bot_response = db.Column(db.Text, nullable=False)
    message_time = db.Column(db.DateTime(timezone=False), server_default=db.func.now())
    
    # Define composite foreign key constraint
    __table_args__ = (
        db.ForeignKeyConstraint(
            ['username', 'sessionname'],
            ['session.username', 'session.sessionname']
        ),
    )

with app.app_context():
    db.create_all()
@app.route("/register",methods=["POST"])
def register():
    data=request.get_json()
    username = data.get("username")
    password = data.get("password")
    fname = data.get("first_name")
    lname = data.get("last_name")
    age = data.get("age")
    sex = data.get("sex")
    occupation = data.get("occupation")

    existing_user = User.query.filter_by(username=username).first()
    if existing_user:
        return jsonify({"message": "Username already exists"}), 400
    
    new_user = User(
        username=username,
        password=password,
        fname=fname,
        lname=lname if lname else "",
        age=age,
        sex=sex,
        occupation=occupation
    )
    db.session.add(new_user)
    db.session.commit()

    return jsonify({"message": "User registered successfully"}), 201

@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"message": "User not found"}), 404

    if user.password != password:
        return jsonify({"message": "Incorrect password"}), 401

    return jsonify({
        "message": "Login successful", 
        "iq": user.iq
    }), 200

@app.route("/saveresult", methods=["POST"])
def save_result():
    # print("hello world")
    data = request.get_json()
    username = data.get("username")
    iq = data.get("iq")
    if iq:
        print("Username",username)
        print("IQ",iq)

    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"message": "User not found"}), 404

    user.iq = iq
    db.session.commit()

    return jsonify({"message": "IQ score saved successfully"}), 200
@app.route("/")
def home():
    return send_from_directory('.', 'login/login.html')

# Serve JS file explicitly (Flask already handles this because of static_url_path='').
@app.route("/chatbot.js")
def serve_js():
    return send_from_directory('.', 'chatbot.js')
@app.route("/session")
def session_page():
    return send_from_directory('session', 'index.html')
@app.route("/session/script.js")
def session_static():
    return send_from_directory('session','script.js')
@app.route("/upload", methods=["POST"])
def upload_session():
    try:
        data = request.get_json()
        # print(data)
        username = data.get("username")
        sessionname = data.get("sessionname")
        text = data.get("text", "")
        sessiontype = data.get("mode")
        
        # Validation
        if not username:
            return jsonify({"error": "Username is required"}), 400
        if not sessionname:
            return jsonify({"error": "Session name is required"}), 400
        if not sessiontype:
            return jsonify({"error": "Mode is required"}), 400
        
        # Check if user exists
        user = User.query.filter_by(username=username).first()
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        new_session = Session(
            username=username,
            sessionname=sessionname,
            sessiontype=sessiontype,
            portion=text if text else None
        )
        db.session.add(new_session)
        db.session.commit()
        
        return jsonify({
            "message": "Session created successfully",
            "file_name": sessionname,
            "mode": sessiontype
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Database error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/get_sessions", methods=["GET"])
def get_sessions():
    # print("Hello")
    username = request.args.get("username")
    if not username:
        return jsonify({"error": "Username is required"}), 400

    sessions = Session.query.filter_by(username=username).order_by(Session.session_created_at.desc()).all()
    data = [
        {
            "sessionname": s.sessionname,
            "sessiontype": s.sessiontype,
            "portion": s.portion,
            "created_at": s.session_created_at.strftime("%Y-%m-%d %H:%M:%S"),
        }
        for s in sessions
    ]
    return jsonify(data), 200
@app.route("/get_portion_by_session", methods=["POST"])
def get_portion_by_session():
    import re, json
    data = request.get_json() or {}

    username = data.get("username")
    sessionname = data.get("sessionname")

    if not username or not sessionname:
        return jsonify({"error": "Username and sessionname are required"}), 400

    session = Session.query.filter_by(username=username, sessionname=sessionname).first()
    if not session:
        return jsonify({"error": "Session not found"}), 404

    portion_data = session.portion
    if not portion_data:
        return jsonify({"portion": None}), 200

    # --- Step 1: Extract JSON portion from bot message ---
    json_block = None
    match = re.search(r'```json(.*?)```', portion_data, re.DOTALL)
    if match:
        json_text = match.group(1).strip()
        try:
            json_text = json_text.replace('""', '"')  # fix double quotes
            json_block = json.loads(json_text)
        except Exception as e:
            print("⚠️ JSON parsing failed:", e)
            json_block = None

    # --- Step 2: Return clean JSON if found ---
    if json_block:
        return jsonify({"portion": json_block}), 200
    else:
        return jsonify({"portion": portion_data}), 200

    

@app.route('/getchathistory', methods=['POST'])
def get_chat_history():
    data = request.get_json()
    username = data.get('username')
    sessionname = data.get('sessionname')

    chats = Chat.query.filter_by(username=username, sessionname=sessionname).order_by(Chat.message_time).all()

    history = []
    for chat in chats:
        history.append({'sender': username, 'message': chat.user_message})
        history.append({'sender': 'Bot', 'message': chat.bot_response})
    if history==[]:
        history.append({'sender': 'Bot', 'message': 'Hello! I am samaveda, your personal coding tutor. What topic would you like to learn today?'})

    return jsonify({'history': history})

@app.route("/temp_get_response", methods=["POST"])
def temp_get_response():
    try:
        data = request.get_json()
        user_message = data.get("message", "")
        
        system_instruction = "You are a helpful assistant. Respond to the user's queries in a concise manner."
        response = requests.post(
            API_URL,
            headers={"Content-Type": "application/json"},
            json={
                "system_instruction": {
                    "parts": [{"text": system_instruction}]
                },
                "contents": [
                    {
                        "role": "user",
                        "parts": [{"text": user_message}]
                    }
                ]
            }
        )
    except Exception as e:
        print("Error:", e)
        return jsonify({"response": "Sorry, I'm having trouble responding."}), 500
    data = response.json()
    if not data.get("candidates"):
        return jsonify({"response": "No response from Gemini API"}), 500
    bot_message = data["candidates"][0]["content"]["parts"][0]["text"]
    return jsonify({"response": bot_message})

@app.route("/extract_keywords", methods=["POST"])
def extract_keywords():
    data = request.get_json()
    text = data.get("text", "")

    if not text:
        return jsonify({"error": "No text provided"}), 400

    # Construct a clear instruction
    system_ins = "Explain the following concept in one concise sentence.only describe in 5 words thats all"

    # Example using your OpenAI or model call
    response = requests.post(
            API_URL,
            headers={"Content-Type": "application/json"},
            json={
                "system_instruction": {
                    "parts": [{"text": system_ins}]
                },
                "contents": [
                    {
                        "role": "user",
                        "parts": [{"text": text}]
                    }
                ]
            }
        )  # <-- your function that queries GPT / LLM
    data = response.json() 
        
    if not data.get("candidates"):
        return jsonify({"response": "No query from Gemini API"}), 500

    finalquery = data["candidates"][0]["content"]["parts"][0]["text"]

    return jsonify({"final": finalquery})

@app.route("/get_response", methods=["POST"])
def get_response():
    try:
        data = request.get_json()
        username = data.get("username")
        sessionname = data.get("sessionname")
        user_message = data.get("message", "")
        user = User.query.filter_by(username=username).first()
        if not user:
            return jsonify({"response": "User not found"}), 404 

#         system_instruction = f"""
# ###Persona###

# You are SamaVeda, a friendly, patient, knowledgeable, and encouraging teacher.
# Your primary goal is to help the student, {username}, learn any subject effectively and build their confidence.

# Ask the student what subject they want to learn first.

# Ask why they want to learn that subject.

# Present the predefined portion (syllabus) for that subject and ask for their confirmation.

# If the student edits or customizes the portion, remember the changes and confirm by responding: "Portion Successfully Created!!!" when the student approves the portion.

# Maintain a supportive and approachable tone throughout the interaction. Use clear language. Introduce technical terms when needed and explain them concisely.

# Refer to the student as {username} occasionally to personalize the conversation.

# Your goal is to guide the student to understand concepts and solve problems themselves, not just provide answers.

# ###Knowledge Sources###

# Base your explanations, definitions, and examples on information consistent with reputable and widely accepted sources: textbooks, Wikipedia, official documentation, or academic resources. Ensure all examples and explanations are accurate and up-to-date.

# ###Initial Teaching Style Based on IQ (Starting Point Only)###

# The user's IQ {user.iq} is used only for the initial teaching style. Feedback during the session will override it.

# If {user.iq} < 80: Start with very simple explanations, provide multiple examples for each concept, and minimize technical terms. Introduce terms slowly with clear definitions and provide frequent summaries.

# If 80 ≤ {user.iq} ≤ 105: Provide clear, straightforward explanations with simple examples, introduce relevant technical terms, and ask normal-difficulty understanding-check questions.

# If {user.iq} > 105: Use concise explanations, comfortably use technical terms, provide examples, and ask higher-difficulty understanding-check questions gradually.

# This IQ-based setting is just the starting point; always adjust based on the user's feedback.

# ###Curriculum and Pace###

# Initial Overview: At the very first learning session, present a high-level overview of the subject with main topic headings.

# Sequential Learning: Teach step-by-step, covering one core concept or a small set of closely related concepts per lesson. Build topics logically on previous concepts.

# Default Pace: Methodical and patient. Explain clearly, using examples when possible.

# User Pace Control: Adjust speed if the user says “too slow” or “too fast.” Confirm adjustment with a message like:

# "Okay, I'll speed up a bit."

# "Understood, I'll slow down and provide more detail."

# ###Interaction Flow for Subject Learning###

# First interaction with {username}:

# Ask: "Which subject would you like to learn today?"

# Ask: "Why do you want to learn this subject?"

# Present the predefined portion (syllabus) for the subject and ask for confirmation.

# Example: "Here’s the portion I suggest for this subject: [portion details]. Does this look good to you?"

# If {username} edits the portion, remember the changes.

# Confirm portion creation when approved: "Portion Successfully Created!!!"

# Sequential teaching:

# Teach topic-by-topic.

# Pause after 2–3 topics for an understanding check.

# ###Interaction: Understanding Checks###

# Frequency: After ~2–3 topics, check {username}'s understanding.

# Question Style: Open-ended, encouraging explanation or application of concepts. Avoid simple yes/no questions.

# Example: "Based on what we just discussed, {username}, could you explain the purpose of [topic]?"

# Example: "Can you give one situation where [concept] would be useful?"

# Response Handling:

# Correct answer → affirmation.

# Incorrect or unclear → gentle correction and brief re-explanation.

# Uncertain → offer to explain differently.

# ###Interaction: Feedback Solicitation and Adaptation###

# Frequency: Every 2–3 topics or after an understanding check.

# Parameters:

# Pace: "Too fast, too slow, or about right?"

# Vocabulary/Complexity: "Is the level of technical detail clear, or should it be simpler/more detailed?"

# Explanation Length/Depth: "Are the explanations detailed enough, or too long/short?"

# Adaptation: Adjust based on feedback and acknowledge:

# "Thanks for the feedback, {username}. I'll adjust the level of detail going forward."

# ###Constraints###

# Only adapt to user feedback; do not rely on IQ or previous metrics for ongoing style adjustments.

# Teach concepts step-by-step and never give direct answers to problems. Guide the user to solve them.

# Base all content on the specified reputable knowledge sources.

# Track and remember portion changes during subject setup.
# """
        system_instruction = f"""
###Persona###
You are SamaVeda, a friendly, patient, knowledgeable, and encouraging teacher.
Your primary goal is to help the student, {username}, learn any subject effectively and build their confidence.

Ask the student what subject they want to learn first.

Ask the student why they want to learn that subject.

Present the predefined portion (syllabus) for that subject and ask for confirmation:
"Here’s the portion I suggest for this subject: [portion details]. Does this look good to you?"

If the student edits or customizes the portion, remember the changes.

When the portion is approved, respond simply: "portion created".

Maintain a supportive and approachable tone throughout the interaction.
Use clear language. Introduce technical terms concisely and explain them.
Refer to the student as {username} occasionally.
Guide the student to understand concepts and solve problems themselves, not just provide answers.

###Knowledge Sources###

Base your explanations, definitions, and examples on reputable and widely accepted sources: textbooks, Wikipedia, official documentation, or academic resources.
Ensure all examples and explanations are accurate, up-to-date, and aligned with best practices.

###Initial Teaching Style Based on IQ (Starting Point Only)###

The user's IQ {user.iq} is used only for the initial teaching style. Feedback during the session will override it.

If {user.iq} < 80: Start with very simple explanations, provide multiple examples, minimize technical terms, and introduce terms slowly with clear definitions. Provide frequent summaries.

If 80 ≤ {user.iq} ≤ 105: Provide clear, straightforward explanations with simple examples, introduce relevant technical terms, and ask normal-difficulty understanding-check questions.

If {user.iq} > 105: Use concise explanations, comfortably use technical terms, provide examples, and ask higher-difficulty understanding-check questions gradually.

###Curriculum and Pace###

Initial Overview: Present a high-level overview of the subject with main topic headings during the first session.

Sequential Learning: Teach step-by-step, covering one core concept or a small set of closely related concepts per lesson. Build topics logically on previous concepts.

Default Pace: Methodical and patient. Explain clearly using examples when possible.

User Pace Control: Adjust speed if the user says “too slow” or “too fast” and confirm adjustment:
"Okay, I'll speed up a bit."
"Understood, I'll slow down and provide more detail."

###Portion Structuring, Tracking, and DB Storage###

Structure the portion into a dictionary/index after approval, including only main units and headings.

Track status for each topic: "inprogress" or "completed".

Example format:

{{
  "Unit 1: Basics": {{
    "Topic 1.1: Introduction": "inprogress",
    "Topic 1.2: Key Concepts": "inprogress"
  }},
  "Unit 2: Advanced": {{
    "Topic 2.1: Applications": "inprogress",
    "Topic 2.2: Case Studies": "inprogress"
  }}
}}

After getting "portion created" message from model, the next bot message (without waiting for user input) must **push the portion dictionary/index in JSON format only**.

Whenever the model needs to show, update, or reference the portion structure, the message must **contain only the JSON portion data**, with no additional words, explanations, or text — just valid JSON.

Update topic statuses dynamically as they are completed.

Save {username}, subject, and structured portion index in the database.

Keep bot messages concise, e.g., "portion created" when the portion is finalized.

###Interaction: Understanding Checks###

After ~2–3 topics, check {username}'s understanding.

Ask open-ended questions, encouraging explanation or application of concepts. Avoid yes/no questions.

Examples:

"Based on what we just discussed, {username}, could you explain the purpose of [topic]?"

"Can you give one situation where [concept] would be useful?"

Correct answers → affirmation.

Incorrect/unclear → gentle correction and brief re-explanation.

Unsure → offer alternate explanation.

###Interaction: Feedback Solicitation and Adaptation###

Every 2–3 topics (or after an understanding check), ask for feedback:

Pace: "Too fast, too slow, or about right?"

Vocabulary/Complexity: "Is the level of technical detail clear, or should it be simpler/more detailed?"

Explanation Length/Depth: "Are the explanations detailed enough, or too long/short?"

Adjust based on feedback and acknowledge:
"Thanks for the feedback, {username}. I'll adjust the level of detail going forward."

###Constraints###

Do not give direct answers to complex problems; guide step-by-step.

Base all explanations on reputable sources.

Track and remember portion edits by the student.

Keep bot messages concise, especially for portion confirmation.

Maintain a supportive, patient, and approachable tone.

###JSON Output Rule for Portions###

- Every time a message includes portion info (portion creation, update, or display), output **only the portion context in valid JSON format**.
- The JSON must contain the complete structured portion index with topic statuses.
- No extra text, comments, or markdown formatting around JSON.
- Example valid bot message when showing portion:

{{
  "Unit 1: Basics": {{
    "Topic 1.1: Introduction": "inprogress",
    "Topic 1.2: Key Concepts": "inprogress"
  }},
  "Unit 2: Advanced": {{
    "Topic 2.1: Applications": "inprogress",
    "Topic 2.2: Case Studies": "inprogress"
  }}
}}

"""       
        response = requests.post(
            API_URL,
            headers={"Content-Type": "application/json"},
            json={
                "system_instruction": {
                    "parts": [{"text": system_instruction}]
                },
                "contents": [
                    {
                        "role": "user",
                        "parts": [{"text": user_message}]
                    }
                ]
            }
        )
        data = response.json() 
        # print(data)

        if not data.get("candidates"):
            return jsonify({"response": "No response from Gemini API"}), 500

        bot_message = data["candidates"][0]["content"]["parts"][0]["text"].strip()
        new_chat = Chat(
            username=username,
            user_message=user_message,
            bot_response=bot_message,
            sessionname=sessionname
        )
        db.session.add(new_chat)
        db.session.commit()
        # if bot_message.lower().strip() == "portion created":
        if bot_message.lower().startswith("portion created"):
            session_record = Session.query.filter_by(username=username, sessionname=sessionname).first()
            if session_record:
                # Update the portion field with bot message (or structured portion if you have it)
                session_record.portion = bot_message[2:]
                db.session.commit()

            # last_bot = (
            #     Chat.query.filter_by(username=username, sessionname=sessionname)
            #     .order_by(Chat.id.desc())
            #     .offset(1)  # skip the current message
            #     .first()
            # )
            # if last_bot:
            #     portion_candidate = last_bot.bot_response.strip()
            #     try:
            #         import json
            #         portion_json = json.loads(portion_candidate)
            #         # Save to DB
            #         session = Session.query.filter_by(username=username, sessionname=sessionname).first()
            #         if session:
            #             session.portion = json.dumps(portion_json)
            #             db.session.commit()
            #             print(f"✅ Portion saved to DB for {username}-{sessionname}")
            #     except Exception as e:
            #         print(f"⚠️ Failed to parse portion JSON: {e}")
            
        return jsonify({"response": bot_message})
    except Exception as e:
        print("Error:", e)
        return jsonify({"response": "Sorry, I'm having trouble responding."}), 500

def decode_image(data_uri):
    img_data = base64.b64decode(data_uri.split(',')[1])
    img = Image.open(BytesIO(img_data))
    return np.array(img)

# Function to analyze emotion
def analyze_emotion(image):
    try:
        result = DeepFace.analyze(image, actions=['emotion'], enforce_detection=False)
        emotion = result[0]['dominant_emotion']
        return emotion
    except Exception as e:
        return str(e)

# Route to receive image and process emotion
@app.route('/analyze_emotion', methods=['POST'])
def analyze():
    data = request.get_json()
    image_data = data['image']
    image = decode_image(image_data)
    emotion = analyze_emotion(image)
    return jsonify({'emotion': emotion})

model = genai.GenerativeModel(
    model_name="gemini-2.0-flash",
    generation_config=generation_config,
)

@app.route('/extract-concept', methods=['POST'])
def extract_concept():
    """
    This route receives a query (text), extracts the main concept in ≤5 words using Gemini.
    Example: "Explain how neural networks work" → "Neural networks basics"
    """
    try:
        data = request.get_json()
        text = data.get('text', '').strip()

        if not text:
            return jsonify({'error': 'Missing text'}), 400

        system_instruction = (
            "You are a YouTube query producer. When someone sends you a query, "
            "understand it and MENTION only the core concept of the entire query — "
            "in not more than 5 words. Nothing else."
        )

        dynamic_model = genai.GenerativeModel(
            model_name="gemini-2.0-flash",
            generation_config=generation_config,
            system_instruction=system_instruction
        )

        chat_session = dynamic_model.start_chat(history=[])
        response = chat_session.send_message(text)
        concept = response.text.strip()

        print(f"Extracted concept: {concept}")
        return jsonify({'concept': concept}), 200

    except Exception as e:
        print(f"Error extracting concept: {e}")
        return jsonify({'error': f'Error extracting concept: {e}'}), 500


# --- YouTube Search API ---
YOUTUBE_API_KEY = 'AIzaSyAGS1dVGAcmMrd2tpqnI7JQv9elMyERD-4'
YOUTUBE_SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search'

@app.route('/search-video', methods=['POST'])
def search_video():
    """
    Search YouTube videos based on extracted concept.
    Returns one main video + 4 alternative recommendations.
    """
    try:
        data = request.get_json()
        query = data.get('query', '').strip()

        if not query:
            return jsonify({'error': 'Missing query'}), 400

        print(f"Searching YouTube for: {query}")

        params = {
            'part': 'snippet',
            'q': query,
            'key': YOUTUBE_API_KEY,
            'type': 'video',
            'maxResults': 5,
            'videoEmbeddable': 'true'
        }

        response = requests.get(YOUTUBE_SEARCH_URL, params=params)
        response.raise_for_status()
        items = response.json().get('items', [])

        if not items:
            return jsonify({'error': 'No videos found'}), 404

        # First result as main, rest as alternatives
        main_video = items[0]
        alt_videos = items[1:]

        main_result = {
            'videoId': main_video['id']['videoId'],
            'watchUrl': f"https://www.youtube.com/watch?v={main_video['id']['videoId']}",
            'title': main_video['snippet']['title'],
        }

        alternatives = [{
            'videoId': vid['id']['videoId'],
            'watchUrl': f"https://www.youtube.com/watch?v={vid['id']['videoId']}",
            'title': vid['snippet']['title'],
        } for vid in alt_videos]

        return jsonify({'mainVideo': main_result, 'alternatives': alternatives}), 200

    except Exception as e:
        print(f"Error searching video: {e}")
        return jsonify({'error': f'Error searching video: {e}'}), 500

if __name__ == "__main__":
    app.run(debug=True)
    