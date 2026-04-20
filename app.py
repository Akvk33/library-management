from flask import Flask, render_template
from flask_jwt_extended import JWTManager
from mongoengine import connect, get_db
import os
from dotenv import load_dotenv
from auth import authBp
from user import userBp
from role import roleBp
from book import bookBp
from borrow import borrowBp
from models import RevokedToken
from flask_cors import CORS

app = Flask(__name__)

load_dotenv("secret.env")
app.config["MONGO_URI"] = os.getenv("MONGO_URI")
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", os.getenv("SECRET_KEY"))
app.config["JWT_TOKEN_LOCATION"] = ["headers"]
app.config["JWT_COOKIE_CSRF_PROTECT"] = False
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = 900
app.config["JWT_REFRESH_TOKEN_EXPIRES"] = 2592000

if not app.config["MONGO_URI"]:
    raise ValueError("MONGO_URI is not set in environment variables")

if not app.config["SECRET_KEY"]:
    raise ValueError("SECRET_KEY is not set in environment variables")

if not app.config["JWT_SECRET_KEY"]:
    raise ValueError("JWT_SECRET_KEY is not set in environment variables")

try:
    connect(host=os.getenv("MONGO_URI"))
    try:
        db = get_db()
        db.command("ping")
        print("MongoDB connected successfully")
    except Exception as e:
        print("MongoDB error:", e)
except Exception as e:
    print(f"Error: {str(e)}")

CORS(
    app,
    supports_credentials=False,
    origins=[
        "https://library-management-1-5913.onrender.com"
    ]
)

jwt = JWTManager(app)


@jwt.token_in_blocklist_loader
def check_if_token_revoked(jwt_header, jwt_payload):
    return RevokedToken.objects(jti=jwt_payload.get("jti")).first() is not None


app.register_blueprint(authBp)
app.register_blueprint(userBp)
app.register_blueprint(roleBp)
app.register_blueprint(bookBp)
app.register_blueprint(borrowBp)

@app.get("/")
@app.get("/<path:path>")
def home(path=None):
    return render_template("../frontend/index.html")

if __name__=="__main__":
    app.run(debug=True)
