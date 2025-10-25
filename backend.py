from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:rusa%40123@localhost/samaveda'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)
from flask_cors import CORS
CORS(app, resources={r"/*": {"origins": "*"}})

# User table model
class User(db.Model):
    __tablename__ = 'user'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    iq = db.Column(db.Integer, nullable=True)
    age = db.Column(db.Integer, nullable=False)
    sex = db.Column(db.String(10), nullable=False)
    fname = db.Column(db.String(20), nullable=False)
    lname = db.Column(db.String(20), nullable=True)

    with app.app_context():
        db.create_all()
# @app.route("/register",methods=["POST"])
# def register():
#     data=request.get_json()
#     username=data.get("username")
#     user= User.query.filter_by(username=username).first()
#     if user:
#         return jsonify({"message": "Username already exists"}), 404
    
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

    return jsonify({"message": "Login successful", "username": user.username}), 200

if __name__ == "__main__":
    app.run(debug=True)
