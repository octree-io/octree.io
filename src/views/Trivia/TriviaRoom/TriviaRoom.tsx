import { Allotment } from "allotment";
import Header from "../../../components/Header/Header";
import "./TriviaRoom.css";
import { useEffect, useState } from "react";
import apiClient from "../../../client/APIClient";
import { useNavigate, useParams } from "react-router-dom";
import TriviaRoomCountdownTimer from "../../../components/TriviaRoom/TriviaRoomCountdownTimer";

const TriviaRoom = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isGraded, setIsGraded] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState("");
  const [timeRemaining, setTimeRemaining] = useState(-1);
  const [responses, setResponses] = useState<{ [key: string]: string }>({});

  const { roomId } = useParams();
  const navigate = useNavigate();

  const submitAnswers = async () => {
    setIsLoading(true);
    setIsGraded(false);

    const response: any = await apiClient.post("/trivia/grade", {
      answers: responses,
    });
    const { answer } = response;

    setAnswers(answer);
    setIsLoading(false);
    setIsGraded(true);
  };

  const getRoomInfo = async () => {
    try {
      const response: any = await apiClient.get(`/trivia/room/${roomId}`);
      const { questions, timeRemainingInMs } = response;

      setQuestions(questions);
      setTimeRemaining(timeRemainingInMs);
    } catch (error) {
      console.log("Error while getting room info:", error);
      navigate("/room-not-found");
    }
  };

  const handleResponseChange = (questionId: string, value: string) => {
    setResponses((prevResponses) => ({
      ...prevResponses,
      [questionId]: value,
    }));
  };

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      console.log("[TriviaRoom] Invalid token");
      navigate("/login");
      return;
    }

    getRoomInfo();
  }, []);

  return (
    <div className="trivia-room-container">
      <Header />

      <Allotment>
        <Allotment.Pane preferredSize="75%">
          <div className="pane" style={{ position: "relative" }}>
            {timeRemaining > -1 && (
              <TriviaRoomCountdownTimer
                timeRemaining={timeRemaining}
              />
            )}

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              {isLoading ? (
                <div>
                  <h2>Grading answers... This may take a minute</h2>
                  <h3>Do not navigate away from the page</h3>
                  <div className="trivia-room-spinner"></div>
                </div>
              ) : isGraded ? (
                <>
                  <h2>Graded answers</h2>

                  <div style={{ whiteSpace: "pre-wrap" }}>
                    {answers}
                  </div>
                </>
              ) : (
                <div style={{ maxWidth: "500px" }}>
                  {questions.map((question: any, index: number) => (
                    <div key={question.questionId}>
                      <h3>{index + 1}. {question.questionText}</h3>
                      <textarea
                        placeholder="Enter your response"
                        rows={10}
                        cols={45}
                        value={responses[question.questionId] || ""}
                        onChange={(e) => handleResponseChange(question.questionId, e.target.value)}
                      />
                    </div>
                  ))}

                  <div>
                    <button onClick={submitAnswers}>Submit answers</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Allotment.Pane>

        <Allotment.Pane preferredSize="25%" maxSize={400}>
          <div className="pane">
            Chat room under construction
          </div>
        </Allotment.Pane>
      </Allotment>
    </div>
  );
};

export default TriviaRoom;
