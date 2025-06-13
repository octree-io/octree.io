import { Editor } from "@monaco-editor/react";
import { Allotment } from "allotment";
import { ocamlLanguageConfiguration, ocamlTokensProvider } from "../../config/ocaml.config";
import "allotment/dist/style.css";
import Header from "../../components/Header/Header";
import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
// import { useNavigate } from "react-router-dom";
import { formatTimestamp } from "../../helper/stringHelpers";
import apiClient from "../../client/APIClient";
import { FaMoon, FaSun } from "react-icons/fa";

interface UserCode {
  [language: string]: string;
}

interface Problem {
  title: string;
  difficulty: string;
  problemHtml: string;
}

const initialConsoleOutputState = {
  stdout: [],
  stderr: [],
  execTime: "",
  timedOut: false,
  submissionId: null,
};

const PracticeRoom = () => {
  const [isRunLoading, setIsRunLoading] = useState(false);
  const [isFetchLoading, setIsFetchLoading] = useState(false);
  const [isHintLoading, setIsHintLoading] = useState(false);
  const [language, setLanguage] = useState("python");
  const [consoleOutput, setConsoleOutput] = useState(initialConsoleOutputState);
  const [messages, setMessages] = useState<any[]>([]);
  const [userCode, setUserCode] = useState<UserCode>({});
  const [currentCode, setCurrentCode] = useState<string>("");
  const [leetcodeUrl, setLeetcodeUrl] = useState("");
  const [problem, setProblem] = useState<Problem>({ title: "", difficulty: "", problemHtml: "" });
  const [darkMode, setDarkMode] = useState(false);

  const [timerDuration, setTimerDuration] = useState(300); // Default 5 minutes in seconds
  const [timeLeft, setTimeLeft] = useState(timerDuration);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // const navigate = useNavigate();
  const editorRef = useRef<any>(null);
  const chatboxRef = useRef<HTMLDivElement>(null);

  function handleEditorWillMount(monaco: any) {
    // Register the OCaml language
    monaco.languages.register({ id: "ocaml" });

    // Register the tokenizer and language configuration
    monaco.languages.setMonarchTokensProvider("ocaml", ocamlTokensProvider);
    monaco.languages.setLanguageConfiguration("ocaml", ocamlLanguageConfiguration);
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };  

  const handleEditorCodeChange = (value: string | undefined) => {
    setUserCode((prevUserCode) => ({
      ...prevUserCode,
      [language]: value || "",
    }));
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedLanguage = e.target.value;
    setCurrentCode(userCode[selectedLanguage]);
    setLanguage(selectedLanguage);
  }

  const handleRunClick = async () => {
    if (isRunLoading) return;

    if (editorRef.current) {
      setIsRunLoading(true);
      setConsoleOutput(initialConsoleOutputState);

      try {
        const response: any = await apiClient.post("/practice-room/run", {
          language,
          code: editorRef.current.getValue(),
        });
        const output = response?.output;
        setConsoleOutput({
          stdout: output.stdout,
          stderr: output.stderr,
          execTime: output.execTime,
          timedOut: output.timedOut,
          submissionId: null,
        });
      } catch (error) {
        console.error("Error executing code:", error);
      } finally {
        setIsRunLoading(false);
      }
    }
  };

  const handleFetchLeetcodeProblemClick = async () => {
    if (isFetchLoading) return;

    setIsFetchLoading(true);

    try {
      const response: any = await apiClient.post("/practice-room/leetcode", {
        leetcodeUrl,
      });
      const question = response?.problem?.data?.question;
      setProblem({
        title: question?.title,
        difficulty: question?.difficulty,
        problemHtml: question?.content,
      });
    } catch (error) {
      console.log("Failed to fetch Leetcode problem:", error);
    } finally {
      setIsFetchLoading(false);
    }
  };

  const handleHintClick = async () => {
    if (isHintLoading) return;

    if (editorRef.current) {
      setIsHintLoading(true);

      try {
        const response: any = await apiClient.post("/practice-room/hint", {
          leetcodeProblemTitle: problem.title,
          code: editorRef.current.getValue(),
        });

        setMessages(prev => [...prev, {
          prefixEmoji: "💡",
          username: "System",
          message: response?.message || "No hint returned.",
          timestamp: new Date().toISOString(),
        }]);
      } catch (error) {
        console.error("Error executing code:", error);
        setMessages(prev => [...prev, {
          prefixEmoji: "⚠️",
          username: "System",
          message: "Failed to fetch hint. Please try again.",
          timestamp: new Date().toISOString(),
        }]);
      } finally {
        setIsHintLoading(false);
      }
    }
  };

  const SystemMessage = memo(({ prefixEmoji, username, message, timestamp }: { 
    prefixEmoji: string, 
    username: string, 
    message: string, 
    timestamp: string 
  }) => (
    <div className={`flex justify-between items-start p-2 mb-2 rounded ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
      <div className="flex flex-col">
        <div className={darkMode ? "text-gray-200" : "text-gray-800"}>
          {prefixEmoji} <span className="font-bold">{username}</span> {message}
        </div>
      </div>
      <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} whitespace-nowrap`}>{formatTimestamp(timestamp)}</div>
    </div>
  ));

  const renderMessages = () => {
    return messages.map((msg, index) => (
      <SystemMessage 
        key={index} 
        prefixEmoji={msg.prefixEmoji} 
        username={msg.username} 
        message={msg.message} 
        timestamp={msg.timestamp} 
      />
    ));
  };

  useLayoutEffect(() => {
    if (chatboxRef.current && chatboxRef.current.scrollHeight - chatboxRef.current.scrollTop - chatboxRef.current.offsetHeight < 600) {
      chatboxRef.current.scrollTop = chatboxRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    setMessages(prev => [...prev, {
      prefixEmoji: "💡",
      username: "System",
      message: "Welcome to the Practice Room! Here you can practice Leetcode problems solo with a timer.",
      timestamp: new Date().toISOString(),
    }]);
  }, []);

  // useEffect(() => {
  //   if (!localStorage.getItem("token")) {
  //     console.log("[Practice Room] Invalid token");
  //     navigate("/login");
  //   }
  // }, [navigate]);

  useEffect(() => {
    if (!isTimerRunning) return;
  
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsTimerRunning(false);
          setMessages(prev => [...prev, {
            prefixEmoji: "⏰",
            username: "System",
            message: "Time's up!",
            timestamp: new Date().toISOString(),
          }]);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  
    return () => clearInterval(interval);
  }, [isTimerRunning]);  

  const getDifficultyColor = () => {
    const base = darkMode ? 'text-white' : 'text-black';
    switch (problem.difficulty?.toLowerCase()) {
      case "easy": return `${base} bg-green-500`;
      case "medium": return `${base} bg-yellow-500`;
      case "hard": return `${base} bg-red-500`;
      default: return `${base} bg-gray-500`;
    }
  };

  return (
    <div className={`flex flex-col h-screen ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      <Header />
      <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-200 border-gray-300'} border-b`}>
        <div className="flex justify-between items-center">
          <div className={`w-24 py-2 text-center ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>Problem</div>
          <button
            onClick={toggleDarkMode}
            className="p-2 mr-4 rounded-full cursor-pointer focus:outline-none"
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? (
              <FaSun className="h-5 w-5 text-yellow-300" />
            ) : (
              <FaMoon className="h-5 w-5 text-gray-700" />
            )}
          </button>
        </div>
      </div>

      <Allotment>
        {/* Problem Pane */}
        <Allotment.Pane preferredSize="25%">
          <div className={`p-4 h-full overflow-auto ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
            <div className="flex items-center mb-4">
              <input
                type="text"
                className={`flex-grow px-4 py-2 rounded-l ${darkMode ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} border focus:outline-none focus:ring-2 focus:ring-purple-600`}
                placeholder="Enter Leetcode URL"
                onChange={(e) => setLeetcodeUrl(e.target.value)}
              />
              <button
                className={`px-4 py-2 rounded-r bg-[#9266cc] hover:bg-[#b68cec] transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-600 text-white ${
                  isFetchLoading ? "opacity-70 cursor-not-allowed" : "cursor-pointer"
                }`}
                onClick={handleFetchLeetcodeProblemClick}
                disabled={isFetchLoading}
              >
                {isFetchLoading ? (
                  <div className="w-5 h-5 border-2 border-t-purple-300 border-gray-700 rounded-full animate-spin mx-auto"></div>
                ) : "Fetch"}
              </button>
            </div>

            <h2 className="text-2xl font-bold mb-4">{problem.title}</h2>

            {problem.difficulty && (
              <div className={`${getDifficultyColor()} text-white font-bold rounded-full px-3 py-1 text-sm w-24 mb-4 text-center`}>
                {problem.difficulty.charAt(0).toUpperCase() + problem.difficulty.slice(1)}
              </div>
            )}
 
            <div 
              className={`prose max-w-none ${darkMode ? 'prose-invert' : ''}`}
              dangerouslySetInnerHTML={{ __html: problem.problemHtml }}
            />
          </div>
        </Allotment.Pane>

        {/* Editor and Console Pane */}
        <Allotment.Pane preferredSize="50%">
          <Allotment vertical>
            <Allotment.Pane preferredSize="85%">
              <div className="h-full flex flex-col">
                <div className={`p-2 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-300'} border-b`}>
                  <select 
                    value={language} 
                    onChange={handleLanguageChange} 
                    title={language}
                    className={`${darkMode ? 'bg-gray-700 text-gray-100 border-gray-600' : 'bg-white text-gray-900 border-gray-300'} px-3 py-1 rounded border`}
                  >
                    <option value="python">Python</option>
                  </select>
                </div>

                <div className="flex-grow">
                  <Editor
                    language={language}
                    theme={darkMode ? "vs-dark" : "light"}
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
                </div>
              </div>
            </Allotment.Pane>

            <Allotment.Pane preferredSize="15%">
              <div className={`flex justify-between items-center p-2 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-300'} border-t`}>
                {/* Left: Timer */}
                <div className="flex items-center">
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={Math.floor(timerDuration / 60)}
                    onChange={(e) => {
                      const minutes = Math.max(1, Math.min(60, parseInt(e.target.value)));
                      setTimerDuration(minutes * 60);
                      setTimeLeft(minutes * 60);
                    }}
                    className={`w-16 mr-2 px-2 py-1 rounded border text-center ${darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-black border-gray-300'}`}
                  />
                  <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                    {formatTime(timeLeft)}
                  </span>
                  <button
                    className={`ml-2 px-3 py-1 rounded bg-[#9266cc] hover:bg-[#b68cec] transition-colors duration-300 ease-in-out text-white focus:outline-none cursor-pointer`}
                    onClick={() => setIsTimerRunning(prev => !prev)}
                  >
                    {isTimerRunning ? "Pause" : "Start"}
                  </button>
                </div>

                {/* Right: Run & Hint buttons */}
                <div className="flex">
                  <button
                    className={`flex items-center justify-center px-4 py-2 rounded mr-2 bg-[#9266cc] hover:bg-[#b68cec] transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-600 text-white ${
                      isRunLoading ? "opacity-70 cursor-not-allowed" : "cursor-pointer"
                    }`}
                    onClick={isRunLoading ? undefined : handleRunClick}
                    disabled={isRunLoading}
                  >
                    {isRunLoading && (
                      <div className="w-5 h-5 border-2 border-t-purple-300 border-gray-700 rounded-full animate-spin mr-2"></div>
                    )}
                    Run
                  </button>
                  <button
                    className={`flex items-center justify-center px-4 py-2 rounded bg-[#9266cc] hover:bg-[#b68cec] transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-600 text-white ${
                      isHintLoading ? "opacity-70 cursor-not-allowed" : "cursor-pointer"
                    }`}
                    onClick={isHintLoading ? undefined : handleHintClick}
                    disabled={isHintLoading}
                  >
                    {isHintLoading && (
                      <div className="w-5 h-5 border-2 border-t-purple-300 border-gray-700 rounded-full animate-spin mr-2"></div>
                    )}
                    Hint
                  </button>
                </div>
              </div>

              <div className={`p-4 h-full overflow-auto ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                {consoleOutput.submissionId && (
                  <div className="mb-2">
                    <span className={darkMode ? "text-gray-400" : "text-gray-600"}>Run ID: </span>
                    <code className="text-purple-400">{consoleOutput.submissionId}</code>
                  </div>
                )}

                <div className="mb-4">
                  <div className={darkMode ? "text-gray-400" : "text-gray-600"}>stdout</div>
                  <div className={`p-2 rounded text-sm font-mono ${darkMode ? 'bg-gray-900' : 'bg-white border border-gray-300'}`}>
                    {consoleOutput.stdout.map((output: any, index) => (
                      <div key={index} className={darkMode ? "text-gray-200" : "text-gray-800"}>{output.text}</div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className={darkMode ? "text-gray-400" : "text-gray-600"}>stderr</div>
                  <div className={`p-2 rounded text-sm font-mono ${darkMode ? 'bg-gray-900' : 'bg-white border border-gray-300'}`}>
                    {consoleOutput.stderr.map((output: any, index) => (
                      <div key={index} className={darkMode ? "text-red-400" : "text-red-600"}>{output.text}</div>
                    ))}
                  </div>
                </div>
              </div>
            </Allotment.Pane>
          </Allotment>
        </Allotment.Pane>

        {/* Chat Pane */}
        <Allotment.Pane preferredSize="25%" maxSize={400}>
          <div className={`h-full flex flex-col ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <div className="flex-grow overflow-hidden">
              <div 
                className={`h-full p-2 overflow-y-auto scrollbar-thin ${darkMode ? 'scrollbar-thumb-gray-600 scrollbar-track-gray-800' : 'scrollbar-thumb-gray-400 scrollbar-track-gray-200'}`}
                ref={chatboxRef}
              >
                {renderMessages()}
              </div>
            </div>
          </div>
        </Allotment.Pane>
      </Allotment>
    </div>
  );
};

export default PracticeRoom;