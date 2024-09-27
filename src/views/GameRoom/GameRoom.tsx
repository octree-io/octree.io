import { Editor } from "@monaco-editor/react";
import { Allotment } from "allotment";
import { ocamlLanguageConfiguration, ocamlTokensProvider } from "../../config/ocaml.config";
import "allotment/dist/style.css";
import Header from "../../components/Header/Header";
import "./GameRoom.css";
import { useRef, useState } from "react";
import axios from "axios";

const GameRoom = () => {
  const [isRunLoading, setIsRunLoading] = useState(false);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [language, setLanguage] = useState("python");
  const [consoleOutput, setConsoleOutput] = useState({
    stdout: [],
    stderr: [],
    execTime: "",
    timedOut: false
  });

  const editorRef = useRef<any>(null);

  function handleEditorWillMount(monaco: any) {
    // Register the OCaml language
    monaco.languages.register({ id: "ocaml" });

    // Register the tokenizer and language configuration
    monaco.languages.setMonarchTokensProvider("ocaml", ocamlTokensProvider);
    monaco.languages.setLanguageConfiguration("ocaml", ocamlLanguageConfiguration);
  }

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value);
  }

  const handleRunClick = async () => {
    if (isRunLoading || isSubmitLoading) {
      return;
    }

    if (editorRef.current) {
      setIsRunLoading(true);
      setIsSubmitLoading(true);

      const code = editorRef.current.getValue();

      const payload = {
        language,
        code,
      };

      try {
        // TODO: Change the endpoint
        const response = await axios.post(`${import.meta.env.VITE_API_URL}/execute`, payload);
        console.log("Run Output:", response.data);
        setConsoleOutput(response.data);
      } catch (error) {
        console.error("Error executing code:", error);
      } finally {
        setIsRunLoading(false);
        setIsSubmitLoading(false);
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
        language,
        code,
      };

      try {
        // TODO: Change the endpoint
        const response = await axios.post(`${import.meta.env.VITE_API_URL}/execute`, payload);
        console.log("Run Output:", response.data);
        setConsoleOutput(response.data);
      } catch (error) {
        console.error("Error executing code:", error);
      } finally {
        setIsRunLoading(false);
        setIsSubmitLoading(false);
      }
    }
  };

  return (
    <div className="game-room">
      <Header />
      <div className="game-room-header-bar">
        <div className="problem-header">Problem</div>
      </div>
      <Allotment>
        <Allotment.Pane preferredSize="25%">
          <div className="pane">
            <h2>Sum</h2>

            <div className="difficulty-badge easy">Easy</div>

            <p>Given an array of integers, find the sum of all of the numbers in the array.</p>
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
                    {/* <option value="typescript">TypeScript</option> */}
                    <option value="ruby">Ruby</option>
                    {/* <option value="go">Go</option> */}
                    <option value="rust">Rust</option>
                    {/* <option value="ocaml">OCaml</option> */}
                  </select>
                  </div>
                </div>
                <Editor
                  language={language}
                  height={"88%"}
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
                  <div className="game-room-timer">15:00</div>
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
                <div>
                  <div>stdout</div>
                  <div className="game-room-console-output">
                    {consoleOutput.stdout.map((output: any, index) => (
                      <div key={index}>{output.text}</div>
                    ))}
                  </div>
                </div>

                <div>
                  <div>stderr</div>
                  <div className="game-room-console-output">
                    {consoleOutput.stderr.map((output: any, index) => (
                      <div key={index}>{output.text}</div>
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
              <div className="game-room-user">
                <div className="game-room-user-profile-wrapper">
                  <img className="game-room-user-profile" src="https://randomuser.me/api/portraits/lego/1.jpg" width={35} height={35}></img>
                </div>
                <div className="game-room-user-name">
                  User1
                </div>
              </div>

              <div className="game-room-user">
                <div className="game-room-user-profile-wrapper">
                  <img className="game-room-user-profile" src="https://images.ctfassets.net/440y9b545yd9/49v1AZmZdiPYkJ4A3vrayj/d7d7db21fed2ef30f5b8e3899633d292/Samoyed850.jpg" width={35} height={35}></img>
                </div>
                <div className="game-room-user-name">
                  User2
                </div>
              </div>
            </div>

            <hr className="game-room-divider" />

            <div className="game-room-chat-container">
              <div className="game-room-chat-messages">
                <div className="game-room-chat-message game-room-system-message">
                  <div className="game-room-message-info">
                    <div className="game-room-message-text">👋 <b>User1</b> joined the room</div>
                  </div>
                  <div className="game-room-chat-time">1:20 AM</div>
                </div>

                <div className="game-room-chat-message game-room-system-message">
                  <div className="game-room-message-info">
                    <div>👋 <b>User2</b> joined the room</div>
                  </div>
                  <div className="game-room-chat-time">1:21 AM</div>
                </div>

                <div className="game-room-chat-message">
                  <div className="game-room-message-info">
                    <div className="game-room-message-content">
                      <div className="game-room-user-profile-wrapper chat-message">
                        <img className="game-room-user-profile" src="https://images.ctfassets.net/440y9b545yd9/49v1AZmZdiPYkJ4A3vrayj/d7d7db21fed2ef30f5b8e3899633d292/Samoyed850.jpg" width={35} height={35}></img>
                      </div>
                      <div className="game-room-message-group">
                        <b>User2</b>
                        <div className="game-room-message-text">hello</div>
                      </div>
                    </div>
                  </div>
                  <div className="game-room-chat-time">1:24 AM</div>
                </div>

                <div className="game-room-chat-message">
                  <div className="game-room-message-info">
                    <div className="game-room-message-content">
                      <div className="game-room-user-profile-wrapper chat-message">
                        <img className="game-room-user-profile" src="https://randomuser.me/api/portraits/lego/1.jpg" width={35} height={35}></img>
                      </div>
                      <div className="game-room-message-group">
                        <b>User1</b>
                        <div className="game-room-message-text">wasup</div>
                      </div>
                    </div>
                  </div>
                  <div className="game-room-chat-time">1:24 AM</div>
                </div>

                <div className="game-room-chat-message game-room-system-message">
                  <div className="game-room-message-info">
                    <div className="game-room-message-text">❌<b>User1</b> submitted a wrong answer.</div>
                  </div>
                  <div className="game-room-chat-time">1:25 AM</div>
                </div>

                <div className="game-room-chat-message game-room-system-message">
                  <div className="game-room-message-info">
                    <div className="game-room-message-text">💯<b>User2</b> finished in 32ms in python!</div>
                  </div>
                  <div className="game-room-chat-time">1:26 AM</div>
                </div>
              </div>

              <textarea className="game-room-chat-input" placeholder="Send a message" />
            </div>
          </div>
        </Allotment.Pane>
      </Allotment>
    </div>

  );
};

export default GameRoom;
