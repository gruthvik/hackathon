from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests

from deepface import DeepFace
from io import BytesIO
import base64
import numpy as np
from PIL import Image


app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)
API_KEY = "AIzaSyB-oPqilevRwC9S8sRXAOepx7BkKMakdHw"
API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={API_KEY}"

# Serve chatbot.html when opening the site
@app.route("/")
def home():
    return send_from_directory('.', 'chatbot.html')

# Serve JS file explicitly (Flask already handles this because of static_url_path='').
@app.route("/chatbot.js")
def serve_js():
    return send_from_directory('.', 'chatbot.js')

# API route for Gemini response
@app.route("/get_response", methods=["POST"])
def get_response():
    try:
        data = request.get_json()
        user_message = data.get("message", "")

        response = requests.post(
            API_URL,
            headers={"Content-Type": "application/json"},
            json={"contents": [{"parts": [{"text": user_message}]}]},
        )

        data = response.json()
        if not data.get("candidates"):
            return jsonify({"response": "No response from Gemini API"}), 500

        bot_message = data["candidates"][0]["content"]["parts"][0]["text"]
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

if __name__ == "__main__":
    app.run(debug=True)
