import { ChangeEvent, useEffect, useState } from "react";
import Header from "../../../components/Header/Header";
import "./CreateTriviaRoom.css";
import { useNavigate } from "react-router-dom";
import apiClient from "../../../client/APIClient";

const CreateTriviaRoom = () => {
  const [showManageBanks, setShowManageBanks] = useState(false);
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState("");
  const [questionBanks, setQuestionBanks] = useState([]);
  const [selectedQuestionBank, setSelectedQuestionBank] = useState("");

  const navigate = useNavigate();

  const getQuestionBanks = async () => {
    const result: any = await apiClient.get("/trivia/question-bank");
    setQuestionBanks(result.questionBanks);

    if (result.questionBanks.length > 0) {
      setSelectedQuestionBank(result.questionBanks[0].questionBankId);
    }
  };

  const createQuestionBank = async () => {
    if (!title.trim() || !questions.trim()) {
      return;
    }

    await apiClient.post("/trivia/question-bank", {
      title,
      questions,
    });

    getQuestionBanks();

    setTitle("");
    setQuestions("");
  };

  const deleteQuestionBank = async (questionBankId: string) => {
    await apiClient.delete(`/trivia/question-bank/${questionBankId}`);

    getQuestionBanks();
  };

  const createTriviaRoom = async () => {
    if (!selectedQuestionBank) {
      console.log("Selected question bank:", selectedQuestionBank);
      return;
    }

    const response: any = await apiClient.post("/trivia/room", { questionBankId: selectedQuestionBank });
    const { roomId } = response;

    if (roomId) {
      setTimeout(() => {
        navigate(`/trivia/${roomId}`);
      }, 250);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      console.log("[CreateTriviaRoom] Invalid token");
      navigate("/login");
      return;
    }

    getQuestionBanks();
  }, []);
  
  return (
    <div className="create-trivia-room-container">
      <Header />

      <div className="create-trivia-room-main-content">
        <div className="create-trivia-room-box">
          <h2>Create Trivia Room</h2>

          <div>
            <label htmlFor="questionBankDropdown">Select Question Bank:</label>
            <select id="questionBankDropdown" value={selectedQuestionBank} onChange={(e) => setSelectedQuestionBank(e.target.value)}>
              {questionBanks.map((questionBank: any, index: number) => (
                <option key={index} value={questionBank.questionBankId}>
                  {questionBank.title}
                </option>
              ))}
            </select>
            <button onClick={getQuestionBanks}>Refresh</button>
          </div>

          <div className="toggle-manage-question-banks">
            <button
              onClick={() => setShowManageBanks(!showManageBanks)}
              className="toggle-button"
            >
              {showManageBanks ? 'Hide' : 'Manage Question Banks'}
            </button>
          </div>

          {showManageBanks && (
            <div className="manage-question-banks">
              <h3>Your Question Banks</h3>
              {questionBanks.length === 0 ? (
                <div>No question banks</div>
              ) : (
                <ul>
                  {questionBanks.map((questionBank: any) => (
                    <li key={questionBank.questionBankId}>
                      {questionBank.title}
                      <button className="delete-bank-button" onClick={() => deleteQuestionBank(questionBank.questionBankId)}>
                        X
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <h3>Create New Question Bank</h3>
              <div className="create-new-question-bank">
                <label htmlFor="newQuestionBankTitle">Title:</label>
                <input
                  type="text"
                  id="newQuestionBankTitle"
                  placeholder="Enter question bank title"
                  value={title}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                />

                <label htmlFor="newQuestionBankQuestions">Questions:</label>
                <textarea
                  id="newQuestionBankQuestions"
                  placeholder="Enter one question per line"
                  rows={10}
                  value={questions}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setQuestions(e.target.value)}
                />

                <div>
                  <button onClick={createQuestionBank}>Create Question Bank</button>
                </div>
              </div>
            </div>
          )}

          <button onClick={createTriviaRoom}>Create Trivia Room</button>
        </div>
      </div>

      <footer className="create-trivia-room-footer">
        <p>
          © 2024 <a href="/">octree.io</a>
          <a href="/terms"> Terms and Conditions</a>
          <a href="/privacy">Privacy Policy</a>
        </p>
      </footer>
    </div>
  );
};

export default CreateTriviaRoom;
