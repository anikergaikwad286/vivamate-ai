
import { useState } from "react";
import "./UploadPage.css";

function UploadPage({ onQuestionsGenerated }) {
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [difficulty, setDifficulty] = useState("Basic");
  const [numberOfQuestions, setNumberOfQuestions] = useState(10);
  const [questions, setQuestions] = useState([]);
  const [generating, setGenerating] = useState(false);

  const handleFiles = (event) => {
    setFiles(Array.from(event.target.files));
    setResults([]);
    setQuestions([]);
    setMessage("");
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setMessage("Please select files first.");
      return;
    }

    const formData = new FormData();

    files.forEach((file) => {
      formData.append("files", file);
    });

    try {
      setLoading(true);
      setMessage("");
      setQuestions([]);

      const response = await fetch("https://vivamate-ai-9el4.onrender.com/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Upload failed");
      }

      setResults(data.results);
      setMessage(data.message);
    } catch (error) {
      setMessage("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQuestions = async () => {
    const successfulResults = results.filter(
      (item) => item.status === "success" && item.extracted_text?.trim()
    );

    if (successfulResults.length === 0) {
      setMessage("Please upload a document containing readable text first.");
      return;
    }

    const projectText = successfulResults
      .map((item) => item.extracted_text)
      .join("\n\n");

    try {
      setGenerating(true);
      setMessage("");
      setQuestions([]);

      const response = await fetch(
        "https://vivamate-ai-9el4.onrender.com/generate-questions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            project_text: projectText,
            difficulty: difficulty,
            number_of_questions: Number(numberOfQuestions),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Question generation failed");
      }

      setQuestions(data.questions);
      onQuestionsGenerated?.(data.questions, difficulty);
      setMessage("Viva questions generated successfully!");
    } catch (error) {
      setMessage("Error: " + error.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="upload-page">
      <div className="upload-header">
        <h1>My Projects</h1>
        <p>Upload your project documents and prepare for AI Viva.</p>
      </div>

      <div className="upload-card">
        <h2>Select Your Project Files</h2>

        <p>
          Supported: PDF, PNG, JPG, WEBP, DOCX, PPTX and TXT
        </p>

        <input
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.pptx,.txt"
          onChange={handleFiles}
        />

        <br /><br />

        <p>Or select an entire folder:</p>

        <input
          type="file"
          multiple
          webkitdirectory=""
          onChange={handleFiles}
        />

        <p>{files.length} file(s) selected</p>

        {files.map((file, index) => (
          <div className="selected-file" key={index}>
            {file.name} â€” {(file.size / 1024).toFixed(1)} KB
          </div>
        ))}

        <button onClick={handleUpload} disabled={loading}>
          {loading ? "Uploading..." : "Upload Files"}
        </button>

        {message && <p className="upload-message">{message}</p>}
      </div>

      {results.length > 0 && (
        <div className="upload-card">
          <h2>Upload Results</h2>

          {results.map((item, index) => (
            <div className="result-item" key={index}>
              <h3>{item.filename}</h3>
              <p>Status: {item.status}</p>

              {item.extracted_text && (
                <details>
                  <summary>View Extracted Text</summary>
                  <pre>{item.extracted_text}</pre>
                </details>
              )}

              {item.error && <p>{item.error}</p>}
            </div>
          ))}
        </div>
      )}

      {results.some(
        (item) => item.status === "success" && item.extracted_text?.trim()
      ) && (
        <div className="upload-card">
          <h2>Generate AI Viva Questions</h2>

          <p>Select your preferred difficulty level:</p>

          <select
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value)}
          >
            <option value="Basic">Basic</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>

          <br /><br />

          <p>Number of Questions:</p>

          <select
            value={numberOfQuestions}
            onChange={(event) =>
              setNumberOfQuestions(Number(event.target.value))
            }
          >
            <option value={5}>5 Questions</option>
            <option value={10}>10 Questions</option>
            <option value={15}>15 Questions</option>
            <option value={20}>20 Questions</option>
            <option value={30}>30 Questions</option>
          </select>

          <br /><br />

          <button
            onClick={handleGenerateQuestions}
            disabled={generating}
          >
            {generating ? "Generating..." : "Generate Viva Questions"}
          </button>
        </div>
      )}

      {questions.length > 0 && (
        <div className="upload-card">
          <h2>Your Viva Questions</h2>

          <p>
            Difficulty: {difficulty} | Total Questions: {questions.length}
          </p>

          {questions.map((question, index) => (
            <div className="result-item" key={index}>
              <h3>Question {index + 1}</h3>
              <p>{question}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default UploadPage;

