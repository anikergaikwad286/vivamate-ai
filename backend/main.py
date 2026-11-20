import os
import re
import time
import secrets
import hashlib
import sqlite3
import smtplib
from pathlib import Path
from io import BytesIO
from email.message import EmailMessage

import bcrypt
import fitz
from docx import Document
from pptx import Presentation
from dotenv import load_dotenv

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from fastapi.openapi.utils import get_openapi


# CONFIGURATION

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

GMAIL_ADDRESS = os.getenv("GMAIL_ADDRESS")
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD")
DATABASE = BASE_DIR / "vivamate.db"

app = FastAPI(
    title="VivaMate AI API",
    description="AI Powered Project Viva Simulator",
    version="3.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# DATABASE

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn


def init_database():
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                is_verified INTEGER DEFAULT 1,
                created_at REAL NOT NULL
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS pending_users (
                email TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                otp_hash TEXT NOT NULL,
                expires_at REAL NOT NULL,
                attempts INTEGER DEFAULT 0,
                last_sent REAL NOT NULL
            )
        """)


init_database()


# EMAIL OTP

def send_otp_email(receiver, otp):
    if not GMAIL_ADDRESS or not GMAIL_APP_PASSWORD:
        raise RuntimeError("Gmail configuration missing")

    message = EmailMessage()
    message["Subject"] = "VivaMate AI - Email Verification OTP"
    message["From"] = GMAIL_ADDRESS
    message["To"] = receiver

    message.set_content(f"""
Hello,

Welcome to VivaMate AI!

Your email verification OTP is: {otp}

This OTP is valid for 5 minutes.

Please do not share this OTP with anyone.

Regards,
VivaMate AI Team
""")

    with smtplib.SMTP("smtp.gmail.com", 587, timeout=20) as server:
        server.starttls()
        server.login(GMAIL_ADDRESS, GMAIL_APP_PASSWORD)
        server.send_message(message)


def hash_otp(email, otp):
    return hashlib.sha256(
        f"{email}:{otp}".encode()
    ).hexdigest()


# AUTH MODELS

class SignupRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: str = Field(max_length=254)
    password: str = Field(min_length=8, max_length=72)


class VerifyOTPRequest(BaseModel):
    email: str
    otp: str = Field(min_length=6, max_length=6)


class LoginRequest(BaseModel):
    email: str
    password: str


# SIGN UP

@app.post("/auth/signup")
def signup(request: SignupRequest):
    name = request.name.strip()
    email = request.email.strip().lower()
    password = request.password

    if not name:
        raise HTTPException(400, "Name is required")

    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        raise HTTPException(400, "Enter a valid email address")

    if len(password.encode("utf-8")) > 72:
        raise HTTPException(400, "Password is too long")

    with get_db() as conn:
        existing = conn.execute(
            "SELECT id FROM users WHERE email = ?",
            (email,)
        ).fetchone()

        if existing:
            raise HTTPException(
                409,
                "Account already exists. Please login."
            )

        pending = conn.execute(
            "SELECT last_sent FROM pending_users WHERE email = ?",
            (email,)
        ).fetchone()

        if pending and time.time() - pending["last_sent"] < 60:
            raise HTTPException(
                429,
                "Please wait 60 seconds before requesting another OTP."
            )

    otp = f"{secrets.randbelow(1000000):06d}"

    password_hash = bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")

    try:
        send_otp_email(email, otp)
    except Exception:
        raise HTTPException(
            500,
            "Unable to send OTP. Check Gmail configuration."
        )

    with get_db() as conn:
        conn.execute("""
            INSERT OR REPLACE INTO pending_users
            (email, name, password_hash, otp_hash,
             expires_at, attempts, last_sent)
            VALUES (?, ?, ?, ?, ?, 0, ?)
        """, (
            email,
            name,
            password_hash,
            hash_otp(email, otp),
            time.time() + 300,
            time.time()
        ))

    return {
        "message": "OTP sent successfully to your email.",
        "email": email,
        "expires_in": 300
    }


# VERIFY OTP

@app.post("/auth/verify-otp")
def verify_otp(request: VerifyOTPRequest):
    email = request.email.strip().lower()
    otp = request.otp.strip()

    if not otp.isdigit():
        raise HTTPException(400, "OTP must contain 6 digits")

    with get_db() as conn:
        pending = conn.execute(
            "SELECT * FROM pending_users WHERE email = ?",
            (email,)
        ).fetchone()

        if not pending:
            raise HTTPException(404, "No pending registration found")

        if time.time() > pending["expires_at"]:
            conn.execute(
                "DELETE FROM pending_users WHERE email = ?",
                (email,)
            )
            raise HTTPException(400, "OTP expired. Please sign up again.")

        if pending["attempts"] >= 5:
            conn.execute(
                "DELETE FROM pending_users WHERE email = ?",
                (email,)
            )
            raise HTTPException(
                429,
                "Too many incorrect attempts. Please sign up again."
            )

        if not secrets.compare_digest(
            pending["otp_hash"],
            hash_otp(email, otp)
        ):
            conn.execute("""
                UPDATE pending_users
                SET attempts = attempts + 1
                WHERE email = ?
            """, (email,))
            raise HTTPException(400, "Incorrect OTP. Please try again.")

        conn.execute("""
            INSERT INTO users
            (name, email, password_hash, is_verified, created_at)
            VALUES (?, ?, ?, 1, ?)
        """, (
            pending["name"],
            email,
            pending["password_hash"],
            time.time()
        ))

        conn.execute(
            "DELETE FROM pending_users WHERE email = ?",
            (email,)
        )

    return {
        "message": "Email verified successfully. Account created!",
        "verified": True
    }


# LOGIN

@app.post("/auth/login")
def login(request: LoginRequest):
    email = request.email.strip().lower()

    with get_db() as conn:
        user = conn.execute(
            "SELECT * FROM users WHERE email = ?",
            (email,)
        ).fetchone()

    if not user:
        raise HTTPException(401, "Invalid email or password")

    if not bcrypt.checkpw(
        request.password.encode("utf-8"),
        user["password_hash"].encode("utf-8")
    ):
        raise HTTPException(401, "Invalid email or password")

    if not user["is_verified"]:
        raise HTTPException(403, "Please verify your email first")

    return {
        "message": "Login successful",
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"]
        }
    }


# FILE EXTRACTION

ALLOWED_EXTENSIONS = {
    ".pdf", ".png", ".jpg", ".jpeg", ".webp",
    ".docx", ".pptx", ".txt"
}

MAX_FILE_SIZE = 10 * 1024 * 1024


def extract_text(filename, content):
    extension = Path(filename).suffix.lower()

    if extension == ".pdf":
        pdf = fitz.open(stream=content, filetype="pdf")
        return "\n".join(page.get_text() for page in pdf)

    elif extension == ".docx":
        doc = Document(BytesIO(content))
        return "\n".join(p.text for p in doc.paragraphs)

    elif extension == ".pptx":
        presentation = Presentation(BytesIO(content))
        texts = []

        for slide in presentation.slides:
            for shape in slide.shapes:
                if shape.has_text_frame:
                    texts.append(shape.text)

        return "\n".join(texts)

    elif extension == ".txt":
        return content.decode("utf-8", errors="replace")

    elif extension in {".png", ".jpg", ".jpeg", ".webp"}:
        return ""

    return ""


# HOME AND HEALTH

@app.get("/")
def home():
    return {
        "message": "Welcome to VivaMate AI Backend!",
        "status": "Running"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "project": "VivaMate AI"
    }


# UPLOAD FILES

@app.post("/upload")
async def upload_files(files: list[UploadFile] = File(...)):
    results = []

    for file in files:
        filename = Path(file.filename or "").name
        extension = Path(filename).suffix.lower()

        if extension not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {filename}"
            )

        content = await file.read()

        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"File too large: {filename}. Maximum size is 10 MB."
            )

        try:
            extracted_text = extract_text(filename, content)

            results.append({
                "filename": filename,
                "status": "success",
                "size_bytes": len(content),
                "extracted_text": extracted_text
            })

        except Exception as error:
            results.append({
                "filename": filename,
                "status": "failed",
                "error": str(error)
            })

    return {
        "message": "File processing completed",
        "total_files": len(results),
        "results": results
    }


# QUESTION GENERATION

class QuestionRequest(BaseModel):
    project_text: str
    difficulty: str = "Basic"
    number_of_questions: int = 10


def clean_project_text(text):
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"[^\w\s.,:;()/%+-]", " ", text)
    return text.strip()


def extract_sentences(text):
    parts = re.split(r"(?<=[.!?])\s+", text)
    sentences = []

    for part in parts:
        part = part.strip()

        if len(part.split()) >= 4:
            sentences.append(part)

    return sentences


def extract_keywords(text):
    stop_words = {
        "this", "that", "with", "from", "have",
        "which", "their", "there", "about", "would",
        "could", "should", "these", "those", "your",
        "what", "when", "where", "while", "into",
        "also", "than", "then", "them", "they",
        "been", "being", "were", "will", "shall",
        "such", "some", "more", "most", "very",
        "each", "only", "using", "used", "uses",
        "does", "make", "made", "main", "project",
        "system", "because", "through", "between",
        "after", "before", "under", "over", "other",
        "and", "the", "for", "are", "was", "is",
        "in", "on", "at", "to", "of", "a", "an",
        "or", "as", "by", "it", "its", "can"
    }

    words = re.findall(
        r"\b[a-zA-Z][a-zA-Z0-9+#.-]{2,}\b",
        text
    )

    keywords = []

    for word in words:
        word = word.lower()

        if word not in stop_words and word not in keywords:
            keywords.append(word)

    return keywords


def generate_question_list(project_text, difficulty, count):
    text = clean_project_text(project_text)
    sentences = extract_sentences(text)
    keywords = extract_keywords(text)

    if not sentences and not keywords:
        raise HTTPException(
            status_code=400,
            detail="Not enough readable project content to generate questions."
        )

    if not sentences:
        sentences = [
            " ".join(keywords[i:i + 8])
            for i in range(0, len(keywords), 8)
            if keywords[i:i + 8]
        ]

    if not keywords:
        keywords = [
            word for sentence in sentences
            for word in sentence.split()
        ]

    templates = {
        "Basic": [
            "Explain the following concept from your project: {sentence}",
            "What is the meaning of this statement in your project: {sentence}?",
            "Describe the role of {keyword} in your project.",
            "Why is {keyword} important in this project?",
            "What do you understand by {keyword}?"
        ],
        "Intermediate": [
            "How does the concept described here work in your project: {sentence}?",
            "Why is the following concept necessary: {sentence}?",
            "How is {keyword} used in your project?",
            "Explain the relationship between {keyword} and the overall project.",
            "What would happen if {keyword} did not work correctly?"
        ],
        "Advanced": [
            "What technical challenges could arise from this project concept: {sentence}?",
            "How would you improve the implementation described here: {sentence}?",
            "What are the limitations of using {keyword} in this project?",
            "How would you test the reliability of {keyword}?",
            "What alternative could replace {keyword}, and why?"
        ]
    }

    selected_templates = templates[difficulty]
    questions = []
    seen = set()

    for i in range(count * 5):
        sentence = sentences[i % len(sentences)]
        keyword = keywords[i % len(keywords)]
        template = selected_templates[i % len(selected_templates)]

        question = template.format(
            sentence=sentence[:180],
            keyword=keyword
        ).strip()

        if question.lower() not in seen:
            seen.add(question.lower())
            questions.append(question)

        if len(questions) == count:
            break

    extra_templates = [
        "Explain how {keyword} contributes to the main objective of your project.",
        "What is the importance of {keyword} in the working of your project?",
        "How can you verify that {keyword} is working correctly?",
        "What could be the effect of changing {keyword} in your project?",
        "Describe one practical application of {keyword} in your project."
    ]

    extra_index = 0

    while len(questions) < count:
        keyword = keywords[extra_index % len(keywords)]
        template = extra_templates[
            extra_index % len(extra_templates)
        ]

        question = template.format(keyword=keyword)

        if question.lower() not in seen:
            seen.add(question.lower())
            questions.append(question)

        extra_index += 1

    return questions[:count]


@app.post("/generate-questions")
def generate_questions(request: QuestionRequest):
    if not request.project_text.strip():
        raise HTTPException(
            status_code=400,
            detail="Project text cannot be empty"
        )

    if request.difficulty not in [
        "Basic", "Intermediate", "Advanced"
    ]:
        raise HTTPException(
            status_code=400,
            detail="Invalid difficulty level"
        )

    if not 1 <= request.number_of_questions <= 30:
        raise HTTPException(
            status_code=400,
            detail="Number of questions must be between 1 and 30"
        )

    questions = generate_question_list(
        request.project_text,
        request.difficulty,
        request.number_of_questions
    )

    return {
        "project": "VivaMate AI",
        "difficulty": request.difficulty,
        "requested_questions": request.number_of_questions,
        "total_questions": len(questions),
        "questions": questions
    }


# OPENAPI

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )

    schema["openapi"] = "3.0.3"

    components = schema.get("components", {}).get("schemas", {})

    for component in components.values():
        properties = component.get("properties", {})

        for prop in properties.values():
            if prop.get("type") == "array":
                items = prop.get("items", {})

                if "contentMediaType" in items:
                    items.pop("contentMediaType", None)
                    items["format"] = "binary"

    app.openapi_schema = schema
    return app.openapi_schema


app.openapi = custom_openapi
