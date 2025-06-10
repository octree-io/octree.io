import { Editor } from "@monaco-editor/react";
import { Allotment } from "allotment";
import { ocamlLanguageConfiguration, ocamlTokensProvider } from "../../config/ocaml.config";
import "allotment/dist/style.css";
import Header from "../../components/Header/Header";
import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatTimestamp } from "../../helper/stringHelpers";
import apiClient from "../../client/APIClient";

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

  const navigate = useNavigate();
  const editorRef = useRef<any>(null);
  const chatboxRef = useRef<HTMLDivElement>(null);

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
    <div className="flex justify-between items-start p-2 mb-2 rounded bg-gray-800">
      <div className="flex flex-col">
        <div className="text-gray-200">
          {prefixEmoji} <span className="font-bold">{username}</span> {message}
        </div>
      </div>
      <div className="text-xs text-gray-400 whitespace-nowrap">{formatTimestamp(timestamp)}</div>
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
    if (!localStorage.getItem("token")) {
      console.log("[Practice Room] Invalid token");
      navigate("/login");
    }
  }, [navigate]);

  const getDifficultyColor = () => {
    switch (problem.difficulty?.toLowerCase()) {
      case "easy": return "bg-green-600";
      case "medium": return "bg-yellow-600";
      case "hard": return "bg-red-600";
      default: return "bg-gray-600";
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100">
      <Header />
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="w-24 py-2 text-center bg-gray-900">Problem</div>
      </div>

      <Allotment>
        {/* Problem Pane */}
        <Allotment.Pane preferredSize="25%">
          <div className="p-4 h-full overflow-auto">
            <div className="flex items-center mb-4">
              <input
                type="text"
                className="flex-grow mr-2 px-4 py-2 rounded-l bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-600 text-gray-100"
                placeholder="Enter Leetcode URL"
                onChange={(e) => setLeetcodeUrl(e.target.value)}
              />
              <button
                className={`px-4 py-2 rounded-r bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-600 ${
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
              className="prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: problem.problemHtml }}
            />
          </div>
        </Allotment.Pane>

        {/* Editor and Console Pane */}
        <Allotment.Pane preferredSize="50%">
          <Allotment vertical>
            <Allotment.Pane preferredSize="85%">
              <div className="h-full flex flex-col">
                <div className="p-2 bg-gray-800 border-b border-gray-700">
                  <select 
                    value={language} 
                    onChange={handleLanguageChange} 
                    title={language}
                    className="bg-gray-700 text-gray-100 px-3 py-1 rounded border border-gray-600"
                  >
                    <option value="python">Python</option>
                  </select>
                </div>
                
                <div className="flex-grow">
                  <Editor
                    language={language}
                    theme="vs-dark"
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

                <div className="flex justify-end p-2 bg-gray-800 border-t border-gray-700">
                  <div className="flex">
                    <button
                      className={`flex items-center justify-center px-4 py-2 rounded mr-2 bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-600 ${
                        isRunLoading ? "opacity-70 cursor-not-allowed" : "cursor-pointer"
                      }`}
                      onClick={isRunLoading ? undefined : handleRunClick}
                      disabled={isRunLoading}
                    >
                      {isRunLoading ? (
                        <div className="w-5 h-5 border-2 border-t-purple-300 border-gray-700 rounded-full animate-spin mr-2"></div>
                      ) : null}
                      Run
                    </button>
                    <button
                      className={`flex items-center justify-center px-4 py-2 rounded bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-600 ${
                        isHintLoading ? "opacity-70 cursor-not-allowed" : "cursor-pointer"
                      }`}
                      onClick={isHintLoading ? undefined : handleHintClick}
                      disabled={isHintLoading}
                    >
                      {isHintLoading ? (
                        <div className="w-5 h-5 border-2 border-t-purple-300 border-gray-700 rounded-full animate-spin mr-2"></div>
                      ) : null}
                      Hint
                    </button>
                  </div>
                </div>
              </div>
            </Allotment.Pane>

            <Allotment.Pane preferredSize="15%">
              <div className="p-4 h-full overflow-auto bg-gray-800">
                {consoleOutput.submissionId && (
                  <div className="mb-2">
                    <span className="text-gray-400">Run ID: </span>
                    <code className="text-purple-400">{consoleOutput.submissionId}</code>
                  </div>
                )}

                <div className="mb-4">
                  <div className="text-gray-400 mb-1">stdout</div>
                  <div className="bg-gray-900 p-2 rounded text-sm font-mono">
                    {consoleOutput.stdout.map((output: any, index) => (
                      <div key={index} className="text-gray-200">{output.text}</div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-gray-400 mb-1">stderr</div>
                  <div className="bg-gray-900 p-2 rounded text-sm font-mono">
                    {consoleOutput.stderr.map((output: any, index) => (
                      <div key={index} className="text-red-400">{output.text}</div>
                    ))}
                  </div>
                </div>
              </div>
            </Allotment.Pane>
          </Allotment>
        </Allotment.Pane>

        {/* Chat Pane */}
        <Allotment.Pane preferredSize="25%" maxSize={400}>
          <div className="h-full flex flex-col bg-gray-800">
            <div className="flex-grow overflow-hidden">
              <div 
                className="h-full p-2 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"
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