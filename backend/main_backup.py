
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import fitz
from docx import Document
from pptx import Presentation
from io import BytesIO
from pathlib import Path

app = FastAPI(
    title="VivaMate AI API",
    description="AI Powered Project Viva Simulator",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_EXTENSIONS = {
    ".pdf", ".png", ".jpg", ".jpeg", ".webp",
    ".docx", ".pptx", ".txt"
}

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


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
        return "Image uploaded successfully. OCR processing will be added next."

    return ""


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

from fastapi.openapi.utils import get_openapi

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

from pydantic import BaseModel

class QuestionRequest(BaseModel):
    project_text: str
    difficulty: str = "Basic"
    number_of_questions: int = 10


@app.post("/generate-questions")
def generate_questions(request: QuestionRequest):

    if not request.project_text.strip():
        raise HTTPException(
            status_code=400,
            detail="Project text cannot be empty"
        )

    if request.difficulty not in ["Basic", "Intermediate", "Advanced"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid difficulty level"
        )

    if not 1 <= request.number_of_questions <= 30:
        raise HTTPException(
            status_code=400,
            detail="Number of questions must be between 1 and 30"
        )

    text = request.project_text.lower()

    questions = []

    if "rfid" in text:
        questions.extend([
            "What is RFID technology?",
            "How does the RC522 RFID module work?",
            "What is the function of an RFID tag?"
        ])

    if "arduino" in text:
        questions.extend([
            "What is Arduino Uno?",
            "Why is Arduino used in this project?"
        ])

    if "lcd" in text:
        questions.append("What is the function of the LCD display?")

    if "buzzer" in text:
        questions.append("Why is a buzzer used in this project?")

    if "google sheets" in text:
        questions.append("How does this project store attendance in Google Sheets?")

    if "python" in text:
        questions.append("What is the role of Python in this project?")

    if not questions:
        questions = [
            "Explain the main objective of your project.",
            "Which technologies are used in your project?",
            "Explain the working of your project."
        ]

    return {
        "project": "VivaMate AI",
        "difficulty": request.difficulty,
        "total_questions": min(len(questions), request.number_of_questions),
        "questions": questions[:request.number_of_questions]
    }
