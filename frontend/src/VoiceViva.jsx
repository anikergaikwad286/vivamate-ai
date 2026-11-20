import { useEffect, useRef, useState } from "react";
import {
  Mic, Play, Square, Trophy, Clock, Sparkles,
  Volume2, ArrowRight, ShieldCheck, Zap,
  Headphones, CircleHelp, RotateCcw
} from "lucide-react";
import "./VoiceViva.css";

function VoiceViva({ questions: incomingQuestions = [], difficulty = "Basic" }) {
  const questions = incomingQuestions;

  const [index, setIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [scores, setScores] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [status, setStatus] = useState("Ready to begin your viva");
  const [recording, setRecording] = useState(false);
  const [started, setStarted] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const recognitionRef = useRef(null);
  const streamRef = useRef(null);

  const speak = (message) => {
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(message);
    speech.rate = 0.95;
    speech.pitch = 0.9;
    window.speechSynthesis.speak(speech);
  };

  const startViva = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("Microphone requires HTTPS or localhost.");
        return;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      setIndex(0);
      setTimeLeft(20);
      setScores(Array(questions.length).fill(0));
      setFeedback("");
      setShowReport(false);
      setStarted(true);
      setStatus("Microphone connected. Examiner is ready.");
      speak("Welcome to VivaMate AI. First question. " + questions[0]);
    } catch (error) {
      setStarted(false);
      setStatus(error.name === "NotAllowedError"
        ? "Please allow microphone access."
        : "Microphone error: " + error.message);
    }
  };

  const startRecording = () => {
    const API = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!API) {
      setStatus("Please use Google Chrome for voice recognition.");
      return;
    }

    if (!started) {
      setStatus("Please start the Viva first.");
      return;
    }

    if (recognitionRef.current) recognitionRef.current.stop();

    const recognition = new API();
    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setRecording(true);
      setStatus("Listening to your answer...");
    };

    recognition.onresult = (event) => {
      const answer = event.results[0][0].transcript;
      const words = answer.trim().split(/\s+/).length;
      const marks = Math.min(10, Math.max(1, Math.round(words / 3)));

      setScores(previous => {
        const updated = [...previous];
        updated[index] = marks;
        return updated;
      });

      setFeedback("Your voice answer was captured successfully.");
      setStatus("Answer recorded successfully.");
      speak("Your score is " + marks + " out of 10.");
    };

    recognition.onerror = (event) => {
      setStatus("Voice recognition error: " + event.error);
      setRecording(false);
    };

    recognition.onend = () => setRecording(false);
    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      setStatus("Could not start voice recognition.");
    }
  };

  const stopMicrophone = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    setRecording(false);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const nextQuestion = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    setRecording(false);
    window.speechSynthesis.cancel();

    if (index === questions.length - 1) {
      setStarted(false);
      setShowReport(true);
      setStatus("Your viva has been completed.");
      stopMicrophone();
      speak("Congratulations. Your viva is completed.");
      return;
    }

    const next = index + 1;
    setIndex(next);
    setTimeLeft(20);
    setFeedback("");
    setStatus("Examiner is asking the next question.");
    speak("Next question. " + questions[next]);
  };

  useEffect(() => {
    if (!started || showReport) return;

    if (timeLeft <= 0) {
      nextQuestion();
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft(previous => previous - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [started, timeLeft, showReport]);

  const stopAll = () => {
    window.speechSynthesis.cancel();
    stopMicrophone();
    setStarted(false);
    setStatus("Viva stopped.");
  };

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      if (recognitionRef.current) recognitionRef.current.stop();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const totalMarks = scores.reduce((sum, mark) => sum + mark, 0);
  const percentage = questions.length > 0 ? Math.round((totalMarks / (questions.length * 10)) * 100) : 0;
  const progress = ((index + 1) / questions.length) * 100;

  return (
    <div className="vv-page">
      <div className="vv-orb vv-orb-one" />
      <div className="vv-orb vv-orb-two" />

      <div className="vv-container">
        <header className="vv-topbar">
          <div className="vv-brand">
            <div className="vv-brand-icon"><Sparkles size={22} /></div>
            <div>
              <strong>VIVAMATE <span>AI</span></strong>
              <small>INTELLIGENT VIVA PLATFORM · {difficulty.toUpperCase()} LEVEL</small>
            </div>
          </div>
          <div className="vv-secure"><ShieldCheck size={15} /> AI VOICE EXAMINER</div>
        </header>

        <section className="vv-heading">
          <div className="vv-eyebrow"><span /> SMART VIVA EXPERIENCE</div>
          <h1>Your Personal <span>Viva Room</span></h1>
          <p>Speak naturally. Practice confidently. Improve continuously.</p>
        </section>

        <div className="vv-layout">
          <main className="vv-main-card">
            {showReport ? (
              <div className="vv-report">
                <div className="vv-report-icon"><Trophy size={34} /></div>
                <div className="vv-section-label">SESSION COMPLETED</div>
                <h2>Excellent work!</h2>
                <p className="vv-muted">Your viva performance summary</p>

                <div className="vv-score-grid">
                  <div className="vv-score-card">
                    <span>TOTAL MARKS</span>
                    <strong>{totalMarks}<small>/{questions.length * 10}</small></strong>
                  </div>
                  <div className="vv-score-card">
                    <span>OVERALL SCORE</span>
                    <strong>{percentage}<small>%</small></strong>
                  </div>
                </div>

                <h3 className="vv-results-title">Question-wise performance</h3>
                {questions.map((question, i) => (
                  <div className="vv-result-row" key={i}>
                    <div>
                      <small>QUESTION {i + 1}</small>
                      <p>{question}</p>
                    </div>
                    <strong>{scores[i]}/10</strong>
                  </div>
                ))}

                <div className="vv-feedback">
                  {percentage >= 70
                    ? "Excellent performance! Keep it up."
                    : percentage >= 40
                    ? "Good effort! Keep practicing."
                    : "Keep practicing to improve your performance."}
                </div>

                <button className="vv-btn vv-btn-primary" onClick={startViva}>
                  <RotateCcw size={17} /> Restart Viva
                </button>
              </div>
            ) : (
              <>
                <div className="vv-card-top">
                  <div>
                    <div className="vv-section-label">YOUR VIVA SESSION</div>
                    <h2>Question <span>{index + 1}</span><small> / {questions.length}</small></h2>
                  </div>
                  <div className={`vv-live ${started ? "is-live" : ""}`}>
                    <span /> {started ? "LIVE SESSION" : "READY"}
                  </div>
                </div>

                <div className="vv-progress-track">
                  <div className="vv-progress-fill" style={{ width: `${progress}%` }} />
                </div>

                <div className="vv-question-box">
                  <div className="vv-question-icon"><CircleHelp size={20} /></div>
                  <div className="vv-section-label">EXAMINER'S QUESTION</div>
                  <h3>{questions[index]}</h3>
                  <button className="vv-listen" onClick={() => speak(questions[index])}>
                    <Volume2 size={15} /> Listen again
                  </button>
                </div>

                <div className="vv-center-stage">
                  <div className={`vv-timer ${timeLeft <= 5 && started ? "vv-timer-warning" : ""}`}>
                    <div className="vv-timer-inner">
                      <Clock size={18} />
                      <strong>{started ? timeLeft : "20"}</strong>
                      <small>SECONDS LEFT</small>
                    </div>
                  </div>

                  <div className={`vv-mic-circle ${recording ? "vv-mic-recording" : ""}`}>
                    <div className="vv-mic-inner"><Mic size={34} /></div>
                  </div>
                  <h3>{recording ? "Listening to your voice..." : "Voice response system"}</h3>
                  <p>{recording ? "Speak clearly into your microphone" : "Your AI examiner is ready to listen"}</p>
                </div>

                <div className="vv-actions">
                  {!started && (
                    <button className="vv-btn vv-btn-primary" onClick={startViva}>
                      <Play size={17} /> Start Viva
                    </button>
                  )}
                  <button className="vv-btn vv-btn-primary" onClick={startRecording} disabled={!started || recording}>
                    <Mic size={17} /> Start Answer
                  </button>
                  <button className="vv-btn vv-btn-secondary" onClick={nextQuestion} disabled={!started}>
                    Next Question <ArrowRight size={17} />
                  </button>
                  <button className="vv-btn vv-btn-stop" onClick={stopAll} disabled={!started}>
                    <Square size={15} /> Stop
                  </button>
                </div>

                <div className="vv-status">
                  <span className={recording ? "vv-status-dot active" : "vv-status-dot"} />
                  {status}
                </div>
                {feedback && <div className="vv-feedback">{feedback}</div>}
              </>
            )}
          </main>

          <aside className="vv-side-panel">
            <div className="vv-side-icon"><Headphones size={23} /></div>
            <div className="vv-section-label">YOUR AI EXAMINER</div>
            <h3>Practice like a real viva.</h3>
            <p>Your examiner will ask questions aloud. Answer using your microphone before the timer ends.</p>
            <div className="vv-side-divider" />
            <div className="vv-side-feature"><Clock size={17} /><span>20 seconds per question</span></div>
            <div className="vv-side-feature"><Mic size={17} /><span>Voice-only interaction</span></div>
            <div className="vv-side-feature"><Trophy size={17} /><span>Instant demo scoring</span></div>
            <div className="vv-side-note">
              <Zap size={16} />
              <span>Tip: Keep your answer clear, focused and confident.</span>
            </div>
          </aside>
        </div>

        <footer className="vv-footer">
          <ShieldCheck size={14} /> Your microphone is used only during your viva session.
          <span>POWERED BY VIVAMATE AI</span>
        </footer>
      </div>
    </div>
  );
}

export default VoiceViva;




