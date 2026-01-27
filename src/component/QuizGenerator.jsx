import React, { useState, useRef, useEffect } from "react";
import botIcon from "../assets/image/logo.svg";
import axios from "axios";
import Select from "react-select";
import "../App.css";

const QuizGenerator = () => {
  const [sessionId, setSessionId] = useState(() => {
    const stored = localStorage.getItem("chatSessionId");
    if (stored) return stored;
    const newId = "session_" + Date.now();
    localStorage.setItem("chatSessionId", newId);
    return newId;
  });

  const [messages, setMessages] = useState(() => {
    const stored = localStorage.getItem(`chatMessages_${sessionId}`);
    return stored ? JSON.parse(stored) : [];
  });

  const [profile, setProfile] = useState("");
  const [numQuestions, setNumQuestions] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("suggestions");
  const [userId, setUserId] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idFromUrl = params.get("userId");
    if (idFromUrl) setUserId(idFromUrl);
  }, []);

  // 🧠 Generate Quiz API Call
  const handleGenerateQuiz = async () => {
    const profileText = document.getElementById("quizQuestion")?.value.trim();
    if (!profileText) {
      alert("Please enter a profile or topic first.");
      return;
    }

    if (!userId) {
      alert("User ID not found in URL.");
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(
        "https://lf2evityhh.execute-api.eu-north-1.amazonaws.com/api/profile-quiz/generate",
        {
          user_id: userId,
          profile: profileText,
          num_questions: numQuestions,
        },
        { headers: { "Content-Type": "application/json" } }
      );

      setActiveTab("chat");
      setMessages((prev) => [
        ...prev,
        { type: "quiz", sender: "bot", quiz: response.data },
      ]);
    } catch (error) {
      console.error("Quiz generation error:", error);
      alert("Failed to generate quiz. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Submit Quiz to API
  const handleSubmitQuiz = async (answers, msgIndex) => {
    try {
      const res = await axios.post(
        "https://lf2evityhh.execute-api.eu-north-1.amazonaws.com/api/v1/quiz/submit",
        {
          session_id: sessionId,
          user_id: userId,
          answers,
        },
        { headers: { "Content-Type": "application/json" } }
      );

      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: `Your quiz score: ${res.data.score}/${res.data.total}\n\n${
            res.data.feedback || ""
          }`,
        },
      ]);
    } catch (err) {
      console.error("Quiz Submit Error:", err);
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "Something went wrong while submitting your quiz. Please try again.",
        },
      ]);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    localStorage.setItem(`chatMessages_${sessionId}`, JSON.stringify(messages));
  }, [messages]);

  // 🧩 QUIZ MESSAGE COMPONENT
  const QuizMessage = ({ quiz, onSubmit }) => {
    const [answers, setAnswers] = useState({});
    const [submitted, setSubmitted] = useState(false);

    const handleSelect = (qIndex, opt) => {
      if (submitted) return;
      setAnswers((prev) => ({ ...prev, [qIndex]: opt }));
    };

    return (
      <div className="quiz-container">
        <h4>{quiz.profile || "Quiz"}</h4>
        <ol>
          {quiz.questions.map((q, i) => (
            <li key={i} style={{ marginBottom: "12px" }}>
              <strong>{q.question}</strong>
              <ul
                style={{
                  marginTop: "5px",
                  listStyleType: "none",
                  paddingLeft: 0,
                }}
              >
                {q.options.map((opt, j) => (
                  <li key={j}>
                    <button
                      onClick={() => handleSelect(i, opt)}
                      disabled={submitted}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        background:
                          answers[i] === opt
                            ? "#6a11cb"
                            : submitted
                            ? "#ddd"
                            : "#f3f3f3",
                        color: answers[i] === opt ? "#fff" : "#000",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border: "none",
                        marginTop: "6px",
                        cursor: submitted ? "default" : "pointer",
                        transition: "all 0.2s ease",
                      }}
                    >
                      {opt}
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>

        {!submitted ? (
          <button
            onClick={() => {
              setSubmitted(true);
              onSubmit(answers);
            }}
            disabled={Object.keys(answers).length < quiz.questions.length}
            style={{
              background: "linear-gradient(90deg, #6a11cb, #2575fc)",
              color: "white",
              padding: "10px 16px",
              borderRadius: "6px",
              border: "none",
              cursor:
                Object.keys(answers).length < quiz.questions.length
                  ? "not-allowed"
                  : "pointer",
              marginTop: "15px",
              fontWeight: "bold",
              width: "100%",
              transition: "all 0.3s ease",
            }}
          >
            Submit Quiz
          </button>
        ) : (
          <p style={{ fontStyle: "italic", color: "#444", marginTop: "10px" }}>
            ✅ Submitted!
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="chat-popup">
      <div className="chat-header-bar">
        <img src={botIcon} alt="Bot" className="profile" />
        <p className="chat-title">Quiz Generator</p>
      </div>

      <div className="chat-scrollable">
        {/* --- Suggestion View --- */}
        {messages.length === 0 && activeTab === "suggestions" && (
          <div className="suggestion-area">
            <div
              className="suggestion-card"
              onClick={() => setActiveTab("quizSetup")}
            >
              <div className="suggestion-text">Generate your Questions</div>
            </div>
          </div>
        )}

        {/* --- QUIZ SETUP SCREEN --- */}
        {activeTab === "quizSetup" && (
          <div className="quiz-setup-screen">
            <h3
              style={{
                marginBottom: "15px",
                fontSize: "1.4rem",
                fontWeight: "bold",
                textAlign: "center",
              }}
            >
              Generate Custom Quiz
            </h3>

            <textarea
              id="quizQuestion"
              value={profile}
              onChange={(e) => setProfile(e.target.value)}
              placeholder="Enter your profile or topic..."
              rows={4}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "8px",
                border: "1px solid #ccc",
                marginBottom: "20px",
                resize: "vertical",
                fontFamily: "inherit",
                fontSize: "1rem",
              }}
            ></textarea>

            <label
              htmlFor="numQuestions"
              style={{
                display: "block",
                marginBottom: "5px",
                fontWeight: "bold",
              }}
            >
              Number of Questions
            </label>

            <Select
              id="numQuestions"
              options={Array.from({ length: 10 }, (_, i) => ({
                value: i + 1,
                label: `${i + 1}`,
              }))}
              placeholder="Select number of questions"
              value={
                numQuestions
                  ? { value: numQuestions, label: String(numQuestions) }
                  : null
              }
              onChange={(selected) => setNumQuestions(selected.value)}
              menuPortalTarget={document.body}
              menuPosition="fixed"
              menuPlacement="auto"
              styles={{
                control: (base) => ({
                  ...base,
                  borderRadius: "8px",
                  padding: "2px",
                  fontSize: "1rem",
                }),
                menuPortal: (base) => ({
                  ...base,
                  zIndex: 99999,
                }),
                menuList: (base) => ({
                  ...base,
                  maxHeight: "200px",
                  overflowY: "auto",
                }),
              }}
            />

            <button
              className="generate-btn"
              onClick={handleGenerateQuiz}
              disabled={loading}
              style={{
                width: "100%",
                background: loading
                  ? "linear-gradient(90deg, #999 0%, #aaa 100%)"
                  : "linear-gradient(90deg, #6a11cb 0%, #2575fc 100%)",
                color: "#fff",
                padding: "10px",
                border: "none",
                borderRadius: "8px",
                fontWeight: "bold",
                marginTop: "15px",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
                transition: "all 0.3s ease",
              }}
            >
              {loading ? "Generating..." : "Generate Quiz"}
            </button>
          </div>
        )}

        {/* --- CHAT MESSAGES WITH QUIZ --- */}
        {activeTab === "chat" && (
          <div className="chat-messages">
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.sender}`}>
                {msg.type === "quiz" ? (
                  <QuizMessage
                    quiz={msg.quiz}
                    onSubmit={(answers) => handleSubmitQuiz(answers, index)}
                  />
                ) : (
                  <p>{msg.text}</p>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizGenerator;
