import { Editor } from "@monaco-editor/react";
import { Allotment } from "allotment";
import { ocamlLanguageConfiguration, ocamlTokensProvider } from "../../config/ocaml.config";
import "allotment/dist/style.css";
import Header from "../../components/Header/Header";
import "./GameRoom.css";
import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import { formatTimestamp } from "../../helper/stringHelpers";
import { refreshAccessToken } from "../../helper/refreshAccessToken";
import { MessageFormatter } from "../../components/MessageFormatter";
import GameRoomCountdownTimer from "../../components/GameRoom/GameRoomCountdownTimer";
import apiClient from "../../client/APIClient";

// TODO: This whole file needs to be refactored

interface StarterCode {
  [language: string]: string;
}

interface UserCode {
  [language: string]: string;
}

const initialConsoleOutputState = {
  stdout: [],
  stderr: [],
  execTime: "",
  timedOut: false,
  submissionId: null,
};

const GameRoom = () => {
  const [isRunLoading, setIsRunLoading] = useState(false);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [language, setLanguage] = useState("python");
  const [consoleOutput, setConsoleOutput] = useState(initialConsoleOutputState);
  const [users, setUsers] = useState<{ [username: string]: string }>({});
  const [messages, setMessages] = useState<any[]>([]);
  const [message, setMessage] = useState<string>("");
  const [roundData, setRoundData] = useState<{ roomId: string, currentRoundStartTime: number, roundDuration: number } | null>(null);
  const [currentProblem, setCurrentProblem] = useState<any>({});
  const [starterCode, setStarterCode] = useState<StarterCode>({});
  const [userCode, setUserCode] = useState<UserCode>({});
  const [currentCode, setCurrentCode] = useState<string>("");

  const navigate = useNavigate();
  const socketRef = useRef<Socket | null>(null);
  const editorRef = useRef<any>(null);
  const chatboxRef = useRef<HTMLDivElement>(null);
  const { roomId } = useParams();

  function handleEditorWillMount(monaco: any) {
    // Register the OCaml language
    monaco.languages.register({ id: "ocaml" });

    // Register the tokenizer and language configuration
    monaco.languages.setMonarchTokensProvider("ocaml", ocamlTokensProvider);
    monaco.languages.setLanguageConfiguration("ocaml", ocamlLanguageConfiguration);
  }

  const handleEditorCodeChange = (value: string | undefined) => {
    setUserCode((prevUserCode) => ({
      ...prevUserCode,
      [language]: value || "",
    }));
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedLanguage = e.target.value;

    setCurrentCode(userCode[selectedLanguage] || starterCode[selectedLanguage]);

    setLanguage(selectedLanguage);
  }

  const handleRunClick = async () => {
    if (isRunLoading || isSubmitLoading) {
      return;
    }

    if (editorRef.current) {
      setIsRunLoading(true);
      setIsSubmitLoading(true);
      setConsoleOutput(initialConsoleOutputState);

      const code = editorRef.current.getValue();

      const payload = {
        roomId,
        language,
        code,
        socketId: socketRef.current?.id,
      };

      try {
        const response: any = await apiClient.post("/execute/run", payload);
        console.log("Run Output:", response);
      } catch (error) {
        console.error("Error executing code:", error);
      }
    }
  };

  const handleSubmitClick = async () => {
    if (isRunLoading || isSubmitLoading) {
      return;
    }

    if (editorRef.current) {
      setIsRunLoading(true);
      setIsSubmitLoading(true);

      const code = editorRef.current.getValue();

      const payload = {
        roomId,
        language,
        code,
        socketId: socketRef.current?.id,
      };

      try {
        const response: any = await apiClient.post("/execute/submit", payload);
        console.log("Run Output:", response);
      } catch (error) {
        console.error("Error executing code:", error);
      }
    }
  };

  const registerSocketEventListeners = (socket: Socket) => {
    socket.on("welcome", () => {
      socket.emit("joinRoom", roomId);
    });

    socket.on("noSuchRoom", () => {
      navigate("/room-not-found");
    });

    socket.on("currentUsers", (data) => {
      console.log("Got currentUsers");
      const currentUsers = data.reduce((acc: any, user: any) => {
        acc[user.username] = user.profilePic;
        return acc;
      }, {});

      setUsers(currentUsers);
    });

    socket.on("chatMessage", (data) => {
      setMessages((prevMessages) => {
        const updatedMessages = [...prevMessages, data];
        return updatedMessages.length > 100 ? updatedMessages.slice(-100) : updatedMessages;
      });
    });

    socket.on("userJoined", (data) => {
      console.log("Got userJoined");
      setUsers((prevUsers) => {
        if (!prevUsers[data.username]) {
          return { ...prevUsers, [data.username]: data.profilePic };
        }
        return prevUsers;
      });

      const systemJoinMessage = {
        message: "has joined the room!",
        username: data.username,
        prefixEmoji: "👋",
        type: "system",
        timestamp: new Date().toISOString(),
      };

      setMessages((prevMessages) => {
        const updatedMessages = [...prevMessages, systemJoinMessage];
        return updatedMessages.length > 100 ? updatedMessages.slice(-100) : updatedMessages;
      });
    });

    socket.on("userLeft", (data) => {
      console.log("Got userLeft", data);
      setUsers((prevUsers) => {
        const updatedUsers = { ...prevUsers };
        delete updatedUsers[data.username];
        return updatedUsers;
      });

      const systemJoinMessage = {
        message: "has left the room!",
        username: data.username,
        prefixEmoji: "🚪",
        type: "system",
        timestamp: new Date().toISOString(),
      };

      setMessages((prevMessages) => {
        const updatedMessages = [...prevMessages, systemJoinMessage];
        return updatedMessages.length > 100 ? updatedMessages.slice(-100) : updatedMessages;
      });
    });

    socket.on("nextRoundStarted", (data) => {
      if (!data.initialJoin) {
        const systemJoinMessage = {
          message: "The next round has started!",
          username: "",
          prefixEmoji: "🚀",
          type: "system",
          timestamp: new Date().toISOString(),
        };
  
        setMessages((prevMessages) => {
          const updatedMessages = [...prevMessages, systemJoinMessage];
          return updatedMessages.length > 100 ? updatedMessages.slice(-100) : updatedMessages;
        });
      }

      const starterCode = data.currentProblem.starterCode;
      setStarterCode(starterCode);
      setUserCode(starterCode);
      setLanguage("python");
      setCurrentCode(starterCode[language]);

      setCurrentProblem(data.currentProblem);
      setRoundData(data);
    });

    socket.on("submitCodeResult", (data) => {
      let systemMessage = {};

      if (data.responseCode === 0) {
        systemMessage = {
          message: `finished in ${data.execTime}ms in ${data.language}!`,
          username: data.user,
          prefixEmoji: "✅",
          type: "system",
          timestamp: new Date().toISOString(),
        };
      } else {
        systemMessage = {
          message: "submitted a wrong answer.",
          username: data.user,
          prefixEmoji: "❌",
          type: "system",
          timestamp: new Date().toISOString(),
        };
      }

      setMessages((prevMessages) => {
        const updatedMessages = [...prevMessages, systemMessage];
        return updatedMessages.length > 100 ? updatedMessages.slice(-100) : updatedMessages;
      });
    });

    socket.on("compilationResponse", (data) => {
      setConsoleOutput({
        stdout: data.stdout.split("\n"),
        stderr: data.stderr.split("\n"),
        execTime: data.execTime,
        timedOut: false,
        submissionId: data.submissionId,
      });
      setIsRunLoading(false);
      setIsSubmitLoading(false);
    });

    socket.on("tokenExpired", async () => {
      console.log("Token expired, refreshing...");
      const newToken = await refreshAccessToken();
      if (newToken && socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = io(import.meta.env.VITE_API_URL + "/gameRoom", {
          auth: {
            token: newToken,
          },
        });

        registerSocketEventListeners(socketRef.current);
      }
    });
  };

  const UserMessage = memo((
    { username, profilePic, message, timestamp }: { username: string, profilePic: string, message: string, timestamp: string }
  ) => {
    return (
      <div className="game-room-chat-message">
        <div className="game-room-message-info">
          <div className="game-room-message-content">
            <div className="game-room-user-profile-wrapper chat-message">
              <img className="user-profile-picture" src={profilePic} width={35} height={35} />
            </div>
            <div className="game-room-message-group">
              <b>{username}</b>
              <div className="game-room-message-text">
                <MessageFormatter message={message} />
              </div>
            </div>
          </div>
        </div>
        <div className="game-room-chat-time">{formatTimestamp(timestamp)}</div>
      </div>
    );
  });

  const SystemMessage = memo(({ prefixEmoji, username, message, timestamp }: { prefixEmoji: string, username: string, message: string, timestamp: string }) => {
    return (
      <div className="game-room-chat-message game-room-system-message">
        <div className="game-room-message-info">
          <div className="game-room-message-text">
            {prefixEmoji} <b>{username}</b> {message}
          </div>
        </div>
        <div className="game-room-chat-time">{formatTimestamp(timestamp)}</div>
      </div>
    );
  });

  const ContinuationMessage = memo(({ message }: { message: string }) => {
    return (
      <div className="game-room-chat-message-continuation">
        <MessageFormatter message={message} />
      </div>
    );
  });

  const renderMessages = () => {
    return messages.map((msg, index) => {
      if (msg.type === "system") {
        return <SystemMessage key={index} prefixEmoji={msg.prefixEmoji} username={msg.username} message={msg.message} timestamp={msg.timestamp} />;
      }

      const isContinuation = index > 0 && messages[index - 1].type !== "system" && messages[index - 1].username === msg.username;

      if (isContinuation) {
        return <ContinuationMessage key={index} message={msg.message} />;
      }

      return (
        <UserMessage
          key={index}
          username={msg.username}
          profilePic={msg.profilePic}
          message={msg.message}
          timestamp={msg.timestamp}
        />
      );
    });
  };

  const handleSendMessage = () => {
    if (message.trim() !== "") {
      socketRef.current?.emit("message", message);
      setMessage("");
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  useLayoutEffect(() => {
    if (chatboxRef.current && chatboxRef.current.scrollHeight - chatboxRef.current.scrollTop - chatboxRef.current.offsetHeight < 600) {
      chatboxRef.current.scrollTop = chatboxRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (socketRef.current) {
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      console.log("[Game Room] Invalid token");
      navigate("/login");
      return;
    }

    socketRef.current = io(import.meta.env.VITE_API_URL + "/gameRoom", {
      auth: {
        token
      },
    });

    registerSocketEventListeners(socketRef.current);

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [navigate]);

  return (
    <div className="game-room">
      <Header />
      <div className="game-room-header-bar">
        <div className="problem-header">Problem</div>
      </div>
      <Allotment>
        <Allotment.Pane preferredSize="25%">
          <div className="pane">
            <h2>{currentProblem.name}</h2>

            <div className={`difficulty-badge ${currentProblem.difficulty || ''}`}>
              {currentProblem.difficulty ? currentProblem.difficulty.charAt(0).toUpperCase() + currentProblem.difficulty.slice(1) : ''}
            </div>

            <div
              className="game-room-problem-section"
              dangerouslySetInnerHTML={{ __html: currentProblem.description }}
            />
          </div>
        </Allotment.Pane>

        <Allotment.Pane preferredSize="50%">
          <Allotment vertical>
            <Allotment.Pane preferredSize="85%">
              <div className="pane">
                <div className="game-room-editor-settings">
                  <div className="game-room-language-selection">
                  <select value={language} onChange={handleLanguageChange} title={language}>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                    <option value="csharp">C#</option>
                    <option value="ruby">Ruby</option>
                    <option value="javascript">JavaScript</option>
                    <option value="typescript">TypeScript</option>
                  </select>
                  </div>
                </div>
                <Editor
                  language={language}
                  height={"88%"}
                  value={currentCode}
                  onChange={handleEditorCodeChange}
                  options={{
                    minimap: { enabled: false },
                    hideCursorInOverviewRuler: true,
                    renderLineHighlight: "none",
                    scrollbar: {
                      verticalScrollbarSize: 8,
                      horizontalScrollbarSize: 8,
                    }
                  }}
                  beforeMount={handleEditorWillMount}
                  onMount={(editor) => (editorRef.current = editor)}
                />

                <div className="game-room-editor-controls">
                  {roundData && 
                    <GameRoomCountdownTimer
                      currentRoundStartTime={roundData.currentRoundStartTime}
                      roundDuration={roundData.roundDuration}
                    />
                  }
                  <div className="game-room-button-container">
                    <div 
                    className={`game-room-button game-room-run-button ${isRunLoading ? 'disabled' : ''}`} 
                      onClick={isRunLoading ? undefined : handleRunClick}
                    >
                      {isRunLoading ? <div className="game-room-button-spinner run-spinner"></div> : 'Run'}
                    </div>
                    <div 
                      className={`game-room-button game-room-submit-button ${isSubmitLoading ? 'disabled' : ''}`} 
                      onClick={isSubmitLoading ? undefined : handleSubmitClick}
                    >
                      {isSubmitLoading ? <div className="game-room-button-spinner submit-spinner"></div> : 'Submit'}
                    </div>
                  </div>
                </div>
              </div>
            </Allotment.Pane>
            <Allotment.Pane preferredSize="15%">
              <div className="pane">
                {consoleOutput.submissionId && (
                  <div>
                    <div>Run ID: <code>{consoleOutput.submissionId}</code></div>
                  </div>
                )}

                <div>
                  <div>stdout</div>
                  <div className="game-room-console-output">
                    {consoleOutput.stdout.map((output: any, index) => (
                      <div key={index}>{output}</div>
                    ))}
                  </div>
                </div>

                <div>
                  <div>stderr</div>
                  <div className="game-room-console-output">
                    {consoleOutput.stderr.map((output: any, index) => (
                      <div key={index}>{output}</div>
                    ))}
                  </div>
                </div>
              </div>
            </Allotment.Pane>
          </Allotment>
        </Allotment.Pane>

        <Allotment.Pane preferredSize="25%" maxSize={400}>
          <div className="pane">
            <div className="game-room-user-list">

            {Object.entries(users).map(([username, profilePic], index) => (
              <div key={index} className="game-room-user">
                <div className="game-room-user-profile-wrapper">
                  <img className="user-profile-picture" src={profilePic} width={35} height={35} />
                </div>
                <div className="game-room-user-name">
                  {username}
                </div>
              </div>
            ))}

            </div>

            <hr className="game-room-divider" />

            <div className="game-room-chat-container">
              <div className="game-room-chat-messages" ref={chatboxRef}>
                {renderMessages()}
              </div>

              <textarea
                className="game-room-chat-input"
                placeholder="Send a message"
                maxLength={2000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
          </div>
        </Allotment.Pane>
      </Allotment>
    </div>

  );
};

export default GameRoom;
