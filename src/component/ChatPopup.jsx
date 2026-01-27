import React, { useState, useRef, useEffect } from "react";
import botIcon from "../assets/image/logo.svg";
import copyIcon from "../assets/image/copy2.png";
import { BiCheckDouble } from "react-icons/bi";
import "../App.css";
import { HiOutlineSpeakerWave } from "react-icons/hi2";
import axios from 'axios';
import Select from "react-select";


// Hook to detect if element is fully visible in viewport
const useOnScreen = (callback) => {
  const ref = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          callback();
        }
      },
      { threshold: 1.0 }
    );

    if (ref.current) observer.observe(ref.current);

    return () => {
      if (ref.current) observer.unobserve(ref.current);
    };
  }, [callback]);

  return ref;
};

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

const ChatPopup = () => {

  // --- Step 1: Create or load a sessionId locally ---
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

  // Utility to remove * from response text
  const cleanText = (text) => {
    if (!text) return "";

    return text
      .replace(/\*\*/g, "")
      .replace(/\*/g, "•")
      .replace(/\.\.+/g, ".")
      .trim();
  };


  const [hasWelcomed, setHasWelcomed] = useState(() => {
    const stored = localStorage.getItem(`chatMessages_${sessionId}`);
    return !!(stored && JSON.parse(stored).length > 0);
  });


  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState("suggestions");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [profile, setProfile] = useState("");
  const [numQuestions, setNumQuestions] = useState(5);
  const countdownInterval = useRef(null);

  const [showCognitiveQuizSetup, setShowCognitiveQuizSetup] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState("medium");
  const [isGenerating, setIsGenerating] = useState(false);
  const [quiz, setQuiz] = useState(null);


  const handleSend = (message = input) => {
    if (typeof message !== "string") {
      message = String(message || "");
    }
    if (!message.trim()) return;

    if (!sessionId) {
      console.error("[ChatPopup] No session_id available!");
      return;
    }

    // 🧩 Detect if the message contains a generated quiz
    let parsedQuiz = null;
    if (message.startsWith("Generated quiz:")) {
      try {
        const jsonPart = message.replace("Generated quiz:", "").trim();
        parsedQuiz = JSON.parse(jsonPart);
      } catch (err) {
        console.error("Failed to parse quiz JSON:", err);
      }
    }

    // ✅ Add message to user chat
    setMessages((prev) => [
      ...prev,
      { text: message, sender: "user", read: false },
    ]);
    setInput("");
    setIsBotTyping(true);

    // If it's a quiz, skip backend call and render it directly
    if (parsedQuiz) {
      console.log(" Rendering quiz:", parsedQuiz);

      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            sender: "bot",
            type: "quiz",
            quiz: parsedQuiz,
            read: false,
          },
        ]);
        setIsBotTyping(false);
      }, 800);

      return;
    }
  };

  // Handle quiz submission to backend
  //  const handleSubmitQuiz = async (answers, msgIndex) => {
  //   try {
  //     const quizData = messages[msgIndex].quiz;

  //     // ✅ Build the "answers" array from user selections
  //     const formattedAnswers = Object.entries(answers).map(([index, userAnswer]) => ({
  //       question_index: Number(index),
  //       user_answer: userAnswer,
  //     }));

  //     // ✅ Create payload with correct structure
  //     const payload = {
  //       user_id: userId,
  //       quiz_type: "profile_based",
  //       profile: quizData.profile,
  //       questions: quizData.questions, // must include correct answers!
  //       answers: formattedAnswers,
  //     };

  //     console.log("🧾 QUIZ SUBMIT PAYLOAD:", JSON.stringify(payload, null, 2));

  //     const res = await axios.post("http://52.87.216.87/api/profile-quiz/submit", payload, {
  //       headers: { "Content-Type": "application/json" },
  //     });

  //     console.log("[Quiz Submit Response]", res.data);

  //     // ✅ Display feedback from backend
  //     setMessages((prev) => [
  //       ...prev,
  //       {
  //         sender: "bot",
  //         text: `✅ Quiz submitted!\nScore: ${res.data.score}/${res.data.total} (${res.data.percentage}%)`,
  //         read: false,
  //       },
  //     ]);
  //   } catch (err) {
  //     console.error("❌ [Quiz Submit Error]", err.response?.data || err);
  //     setMessages((prev) => [
  //       ...prev,
  //       {
  //         sender: "bot",
  //         text: "Something went wrong while submitting your quiz. Please try again later.",
  //         read: false,
  //       },
  //     ]);
  //   }
  // };
  // const handleSubmitQuiz = async (answers, msgIndex) => {
  //   try {
  //     const quizData = messages[msgIndex].quiz;
  //     const quizType = quizData.quiz_type || "profile_based"; // auto-detect
  //     const isDifficulty = quizType === "difficulty_based";

  //     // ✅ Build formatted answers
  //     const formattedAnswers = answers;


  //     // ✅ Build payload
  //     const payload = {
  //       user_id: userId,
  //       quiz_type: quizType,
  //       ...(isDifficulty
  //         ? { difficulty_level: quizData.difficulty_level } // add difficulty field
  //         : { profile: quizData.profile }),
  //       questions: quizData.questions, // must include correct answers
  //       answers: formattedAnswers,
  //     };

  //     console.log("🧾 QUIZ SUBMIT PAYLOAD:", JSON.stringify(payload, null, 2));

  //     // ✅ Choose endpoint dynamically
  //     const endpoint = isDifficulty
  //       ? "http://52.87.216.87/api/difficulty-quiz/submit"
  //       : "http://52.87.216.87/api/profile-quiz/submit";

  //     const res = await axios.post(endpoint, payload, {
  //       headers: { "Content-Type": "application/json" },
  //     });

  //     console.log("[Quiz Submit Response]", res.data);

  //     // ✅ Show results
  //     setMessages((prev) => [
  //       ...prev,
  //       {
  //         sender: "bot",
  //         type: "score",
  //         scoreData: {
  //           score: res.data.score,
  //           total: res.data.total,
  //           percentage: res.data.percentage,
  //         },
  //         read: false,
  //       },
  //     ]);

  //   } catch (err) {
  //     console.error("❌ [Quiz Submit Error]", err.response?.data || err);
  //     setMessages((prev) => [
  //       ...prev,
  //       {
  //         sender: "bot",
  //         text: "Something went wrong while submitting your quiz. Please try again later.",
  //         read: false,
  //       },
  //     ]);
  //   }
  // };
  const handleSubmitQuiz = async (answers, msgIndex) => {
    try {
      const quizData = messages[msgIndex].quiz;
      const quizType = quizData.quiz_type || "profile_based"; // auto-detect
      const isDifficulty = quizType === "difficulty_based";

      // ✅ answers already formatted as [{ question_index, user_answer }]
      const formattedAnswers = answers;

      // ✅ Build payload
      const payload = {
        user_id: userId,
        quiz_type: quizType,
        ...(isDifficulty
          ? { difficulty_level: quizData.difficulty_level }
          : { profile: quizData.profile }),
        questions: quizData.questions,
        answers: formattedAnswers,
      };

      console.log("🧾 QUIZ SUBMIT PAYLOAD:", JSON.stringify(payload, null, 2));

      // ✅ Choose endpoint dynamically
      const endpoint = isDifficulty
        ? "https://lf2evityhh.execute-api.eu-north-1.amazonaws.com/api/difficulty-quiz/submit"
        : "https://lf2evityhh.execute-api.eu-north-1.amazonaws.com/api/profile-quiz/submit";

      const res = await axios.post(endpoint, payload, {
        headers: { "Content-Type": "application/json" },
      });

      console.log("[Quiz Submit Response]", res.data);

      // ✅ 1️⃣ Merge backend results into quiz so QuizMessage can display them
      const gradedResults = res.data.results || [];

      setMessages((prev) => {
        const updated = [...prev];
        const quizMsg = { ...updated[msgIndex] };
        quizMsg.quiz = {
          ...quizMsg.quiz,
          results: gradedResults,
          score: res.data.score,
          total: res.data.total,
          percentage: res.data.percentage,
          submitted_at: res.data.submitted_at,
        };
        updated[msgIndex] = quizMsg;

        // ✅ 2️⃣ Append the bot’s score message
        updated.push({
          sender: "bot",
          type: "score",
          scoreData: {
            score: res.data.score,
            total: res.data.total,
            percentage: res.data.percentage,
          },
          read: false,
        });

        return updated;
      });

    } catch (err) {
      console.error("[Quiz Submit Error]", err.response?.data || err);
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text:
            "Something went wrong while submitting your quiz. Please try again later.",
          read: false,
        },
      ]);
    }
  };





  useEffect(() => {

    const params = new URLSearchParams(window.location.search);
    const idFromUrl = params.get("userId");
    console.log("userId from URL:", idFromUrl);
    if (idFromUrl) setUserId(idFromUrl);
  }, []);


  useEffect(() => {
    const storedId = localStorage.getItem("userId");
    if (storedId) setUserId(storedId);
  }, []);

  const handleGenerateQuiz = async () => {
    console.log("⚡ handleGenerateQuiz called");

    const profile = document.getElementById("quizQuestion")?.value.trim();

    // ✅ use the React state directly
    console.log("Number of questions selected:", numQuestions);

    const params = new URLSearchParams(window.location.search);
    const userIdFromUrl = params.get("userId");

    if (!profile) {
      alert("Please enter a profile or topic first.");
      return;
    }

    if (!userIdFromUrl) {
      alert("User ID not found in URL.");
      console.error("userId is null");
      return;
    }

    try {
      setLoading(true);

      console.log("Sending data:", {
        user_id: userIdFromUrl,
        profile,
        num_questions: numQuestions,
      });

      const response = await axios.post(
        "https://lf2evityhh.execute-api.eu-north-1.amazonaws.com/api/profile-quiz/generate",
        {
          user_id: userIdFromUrl,
          profile,
          num_questions: numQuestions,
        },
        { headers: { "Content-Type": "application/json" } }
      );

      console.log("Quiz generated:", response.data);

      setActiveTab("chat");
      setMessages((prev) => [
        ...prev,
        {
          type: "quiz",
          sender: "bot",
          quiz: response.data,
        },
      ]);
    } catch (error) {
      console.error("Failed to generate quiz:", error.response?.data || error);
      alert("Failed to generate quiz. Please try again later2.", error.response.data);
    } finally {
      setLoading(false);
    }
  };

  // for 2 second Quiz
  
  const handleGenerateCognitiveQuiz = async () => {
    setIsGenerating(true);

    try {
      
      const questionCount = numQuestions; 

      const payload = {
        user_id: userId,
        difficulty_level: selectedDifficulty,
        num_questions: questionCount,
      };

      console.log("Cognitive Quiz Payload:", payload);

      const res = await axios.post(
        "https://lf2evityhh.execute-api.eu-north-1.amazonaws.com/api/difficulty-quiz/generate",
        payload
      );

      const quizData = res.data;

      // ✅ Clean + readable quiz title
      quizData.profile = `Cognitive Quiz (${quizData.difficulty_level?.toUpperCase?.() || "N/A"})`;
      quizData.quiz_type = "difficulty_based";

      // ✅ Append to chat
      setMessages((prev) => [
        ...prev,
        { sender: "bot", type: "quiz", quiz: quizData },
      ]);

      setActiveTab("chat");
      setShowCognitiveQuizSetup(false);
    } catch (err) {
      console.error("Quiz generation failed:", err.response?.data || err);
      alert("Failed to generate quiz. Please try again later.");
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    localStorage.setItem(`chatMessages_${sessionId}`, JSON.stringify(messages));
    return () => {
      clearInterval(countdownInterval.current);
    };
  }, [messages]);

  const options = Array.from({ length: 10 }, (_, i) => ({
    value: i + 5,
    label: `${i + 1}`,
  }));

  const QuizMessage = ({ quiz, onSubmit }) => {
    const [answers, setAnswers] = useState({});
    const [submitted, setSubmitted] = useState(false);

    const persistKey = `quiz_submitted_${quiz?.created_at ?? quiz?.id ?? "anon_quiz"}`;
    // ✅ when quiz or results come in from backend, sync local answers
    useEffect(() => {
      if (!quiz) return;
      // if backend results exist, prefill answers and mark submitted
      if (quiz.results?.length) {
        const restored = {};
        quiz.results.forEach((r) => {
          if (r.user_answer) restored[r.question_index] = r.user_answer;
        });
        if (Object.keys(restored).length > 0) {
          setAnswers(restored);
          setSubmitted(true);
          return;
        }
      }

      // else check local storage
      const saved = localStorage.getItem(persistKey);
      if (saved === "true") setSubmitted(true);
    }, [quiz, persistKey]);

    const handleAnswerChange = (qIndex, option) => {
      if (submitted) return;
      setAnswers((prev) => ({ ...prev, [qIndex]: option }));
    };

    const handleSubmit = () => {
      localStorage.setItem(persistKey, "true");
      setSubmitted(true);

      const formattedAnswers = Object.entries(answers).map(([index, value]) => ({
        question_index: Number(index),
        user_answer: value,
      }));

      console.log("QUIZ SUBMIT PAYLOAD:", formattedAnswers);
      try {
        onSubmit(formattedAnswers);
      } catch (err) {
        console.error("onSubmit error:", err);
      }
    };

    return (
      <div className="quiz-container" style={{ marginTop: 12 }}>


        <ol style={{ paddingLeft: 18 }}>
          {quiz.questions.map((q, index) => {
            // --- local + server fallback ---
            const localAnswer = answers[index];
            const resultItem = quiz.results?.find((r) => r.question_index === index);

            // always prefer backend answer if present
            const userAnswer = resultItem?.user_answer || localAnswer || "";
            const correctAnswer = resultItem?.correct_answer || q.answer || "";

            // if backend says it's submitted, ensure we mark it as submitted
            const hasServerResult = !!resultItem || quiz.results?.length > 0;
            const isActuallySubmitted = submitted || hasServerResult;

            // correct/wrong logic
            const isCorrect =
              resultItem?.is_correct ?? (userAnswer === correctAnswer);

            const userSelectedButWrong =
              isActuallySubmitted && userAnswer && userAnswer !== correctAnswer;



            return (
              <li key={index} style={{ marginBottom: 14 }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>
                  {q.question}
                </div>

                <div>
                  {q.options.map((opt, i) => {
                    let bg = "transparent";
                    let border = "1px solid #ccc";
                    let color = "#000";

                    if (submitted) {
                      if (opt === correctAnswer) {
                        bg = "#d4edda";
                        border = "1px solid #28a745";
                      } else if (opt === userAnswer && userAnswer !== correctAnswer) {
                        bg = "#f8d7da";
                        border = "1px solid #dc3545";
                      }
                    } else if (opt === userAnswer) {
                      bg = "#e7f0fe";
                      border = "1px solid #a0bdfc";
                    }

                    return (
                      <label
                        key={i}
                        style={{
                          display: "block",
                          background: bg,
                          border,
                          borderRadius: 6,
                          padding: "8px 10px",
                          marginBottom: 6,
                          cursor: submitted ? "default" : "pointer",
                          transition: "all 0.12s ease",
                          color,
                        }}
                      >
                        <input
                          type="radio"
                          name={`q-${index}`}
                          value={opt}
                          checked={userAnswer === opt}
                          onChange={() => handleAnswerChange(index, opt)}
                          disabled={submitted}
                          style={{ marginRight: 8 }}
                        />
                        {opt}
                      </label>
                    );
                  })}
                </div>

                {submitted && (
                  <div style={{ marginTop: 8 }}>
                    {isCorrect ? (
                      <div style={{ color: "#1b5e20", fontWeight: 600 }}>
                        Correct!
                      </div>
                    ) : userAnswer ? (
                      <div style={{ color: "#b71c1c", fontWeight: 600 }}>
                        Incorrect <br />
                        <span style={{ color: "#555" }}>
                          Your answer:{" "}
                          <span style={{ fontWeight: 700 }}>{userAnswer}</span>
                          <br />
                          Correct answer:{" "}
                          <span style={{ fontWeight: 700 }}>{correctAnswer}</span>
                        </span>
                      </div>
                    ) : (
                      <div style={{ color: "#b71c1c", fontWeight: 600 }}>
                        No answer selected <br />
                        <span style={{ color: "#555" }}>
                          Correct answer:{" "}
                          <span style={{ fontWeight: 700 }}>{correctAnswer}</span>
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>

        {/* {!submitted && (
          <div style={{ display: "flex", justifyContent: "center", marginTop: 10 }}>
            <button
              onClick={handleSubmit}
              disabled={Object.keys(answers).length < quiz.questions.length}
              style={{
                background: "#4285F4",
                color: "white",
                padding: "10px 16px",
                borderRadius: 8,
                border: "none",
                cursor:
                  Object.keys(answers).length < quiz.questions.length
                    ? "not-allowed"
                    : "pointer",
                fontWeight: 600,
              }}
            >
              Submit Quiz
            </button>
          </div>
        )} */}
        {!submitted && (
  <div style={{ display: "flex", justifyContent: "center", marginTop: 10 }}>
    <button
      onClick={handleSubmit}
      disabled={Object.keys(answers).length < quiz.questions.length}
      style={{
        background: "#4285F4",
        color: "white",
        padding: "10px 16px",
        borderRadius: 8,
        border: "none",
        cursor:
          Object.keys(answers).length < quiz.questions.length
            ? "not-allowed"
            : "pointer",
        fontWeight: 600,
      }}
    >
      Submit Quiz
    </button>
  </div>
)}

{submitted && (
  <div style={{ textAlign: "center", marginTop: 12 }}>
    <div style={{ color: "#2e7d32", fontWeight: 700 }}>Quiz submitted!</div>

  <button
  onClick={() => {
    setSubmitted(false);
    setAnswers({});
    setQuiz(null);
    setMessages([]);
    setActiveTab("suggestions"); // ✅ make sure this matches your rendering condition
    setHasWelcomed(false);
  }}
  style={{
    marginTop: 12,
    background: "#08D75F",
    color: "white",
    padding: "10px 16px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
  }}
>
  Take Another Test
</button>


  </div>
)}


       
      </div>
    );
  };


  return (
    <>
      <div className="chat-popup">
        {/* ---------------- Header ---------------- */}
       {messages.length > 0 && (
  <button
    className="reset-btn"
    onClick={() => {
      // 🧹 Clear chat
      setMessages([]);
      setHasWelcomed(false);
      localStorage.removeItem(`chatMessages_${userId}`);

      // 💡 Show suggestion cards again
      setActiveTab("suggestions");
    }}
    title="Reset chat"
    aria-label="Reset chat"
  >
    Go to Quiz Selection
  </button>
)}


        {/* ---------------- Scrollable Chat Area ---------------- */}
        <div className="chat-scrollable">
          {/* --- Suggestion Cards --- */}
          {messages.length === 0 && activeTab === "suggestions" && (
            <div className="suggestion-area">
              <div
                className="suggestion-card"
                onClick={() => setActiveTab("quizSetup")}
              >
                <div className="suggestion-text">Generate Profile Quiz</div>
              </div>

              <div
                className="suggestion-card"
                onClick={() => setShowCognitiveQuizSetup(true)}
              >
                <div className="suggestion-text">Generate Cognitive Quiz</div>
              </div>
            </div>
          )}

          {/* --- Custom Quiz Setup --- */}
          {activeTab === "quizSetup" && (
            <div className="quiz-setup-screen">
              <button
                className="back-btn"
                onClick={() => setActiveTab("suggestions")}
                style={{
                  backgroundColor: "transparent",
                  border: "2px solid #2575fc",
                  color: "#2575fc",
                  padding: "8px 14px",
                  borderRadius: "8px",
                  fontWeight: "600",
                  cursor: "pointer",
                  marginBottom: "15px",
                  transition: "all 0.3s ease",
                  fontSize: "1rem",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = "#2575fc";
                  e.currentTarget.style.color = "#fff";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "#2575fc";
                }}
              >
                ← Back
              </button>

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
                options={Array.from({ length: 6 }, (_, i) => ({
                  value: i + 5,
                  label: String(i + 5),
                }))}
                placeholder="Select number of questions"
                value={{ value: numQuestions, label: String(numQuestions) }}
                onChange={(selected) => {
                  console.log(" Selected questions:", selected.value);
                  setNumQuestions(selected.value);
                }}
                menuPortalTarget={document.body}
                menuPosition="fixed"
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

          {/* --- Chat Messages --- */}
          {activeTab === "chat" && (
            <div className="chat-messages">
              {messages.map((msg, index) => (
                <div key={index} className={`message ${msg.sender}`}>
                  {msg.type === "quiz" ? (
                    <QuizMessage
                      quiz={msg.quiz}
                      onSubmit={(answers) => handleSubmitQuiz(answers, index)}
                    />
                  ) : msg.type === "score" ? (
                    <div
                      style={{
                        background: "linear-gradient(135deg, #6a11cb, #2575fc)",
                        color: "white",
                        padding: "20px",
                        borderRadius: "12px",
                        textAlign: "center",
                        boxShadow: "0 4px 10px rgba(0, 0, 0, 0.15)",
                        maxWidth: "300px",
                        margin: "10px auto",
                        fontFamily: "Poppins, sans-serif",
                      }}
                    >
                      <h3
                        style={{
                          margin: "0 0 10px 0",
                          fontSize: "1.4rem",
                          fontWeight: "700",
                        }}
                      >
                        Your Score
                      </h3>
                      <p style={{ fontSize: "1.2rem", fontWeight: "600", margin: "4px 0" }}>
                        {msg.scoreData.score} / {msg.scoreData.total}
                      </p>
                      <p
                        style={{
                          fontSize: "1rem",
                          opacity: 0.9,
                          marginBottom: "0",
                        }}
                      >
                        ({msg.scoreData.percentage}%)
                      </p>

                      <div
                        style={{
                          marginTop: "10px",
                          height: "8px",
                          background: "rgba(255,255,255,0.3)",
                          borderRadius: "4px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${msg.scoreData.percentage}%`,
                            background: "#00ffb3",
                            transition: "width 0.6s ease",
                          }}
                        ></div>
                      </div>
                    </div>
                  ) : (
                    <p>{msg.text}</p>
                  )}

                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ---------------- Cognitive Quiz Modal ---------------- */}
        {showCognitiveQuizSetup && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 9999,
            }}
          >
            <div
              style={{
                background: "white",
                borderRadius: "12px",
                padding: "20px 30px",
                width: "350px",
                textAlign: "center",
                boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
              }}
            >
              <h3>Cognitive Quiz Setup</h3>

              <div style={{ marginTop: "15px" }}>
                <p>
                  <strong>Select Difficulty Level:</strong>
                </p>
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  style={{
                    padding: "6px 8px",
                    borderRadius: "6px",
                    border: "1px solid #ccc",
                    marginBottom: "15px",
                  }}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Difficult</option>
                </select>
                {/* ✅ Number of Questions Selector */}
                <select
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(Number(e.target.value))}
                  style={{
                    padding: "6px 8px",
                    borderRadius: "6px",
                    border: "1px solid #ccc",
                    flex: 1,
                  }}
                >
                 
                  <option value="5">5 Questions</option>
                  <option value="7">7 Questions</option>
                  <option value="10">10 Questions</option>
                </select>

                <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
                  <button
                    onClick={handleGenerateCognitiveQuiz}
                    disabled={isGenerating}
                    style={{
                      background: isGenerating ? "#a0bdfc" : "#4285F4",
                      color: "white",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "none",
                      cursor: isGenerating ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      minWidth: "110px",
                    }}
                  >
                    {isGenerating ? (
                      <>
                        <div
                          style={{
                            width: "16px",
                            height: "16px",
                            border: "2px solid white",
                            borderTop: "2px solid transparent",
                            borderRadius: "50%",
                            animation: "spin 1s linear infinite",
                          }}
                        />
                        Generating...
                      </>
                    ) : (
                      "Generate"
                    )}
                  </button>

                  <button
                    onClick={() => setShowCognitiveQuizSetup(false)}
                    style={{
                      background: "#ccc",
                      color: "#333",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- Chat Input ---------------- */}
        <div className="chat-input-wrapper">
          <div className="chat-input">{/* Input elements can go here */}</div>
        </div>
      </div>
    </>
  );

};

export default ChatPopup;
