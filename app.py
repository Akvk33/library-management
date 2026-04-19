from flask import Flask, render_template
from mongoengine import connect, get_db
import os
from dotenv import load_dotenv
from auth import authBp
from user import userBp
from role import roleBp
from book import bookBp
from borrow import borrowBp

app=Flask(__name__)

load_dotenv("secret.env")
app.config["MONGO_URI"]=os.getenv("MONGO_URI")
app.config["SECRET_KEY"]=os.getenv("SECRET_KEY")

if not app.config["MONGO_URI"]:
    raise ValueError("MONGO_URI is not set in environment variables")

if not app.config["SECRET_KEY"]:
    raise ValueError("SECRET_KEY is not set in environment variables")

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
