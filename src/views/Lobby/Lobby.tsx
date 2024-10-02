import { io, Socket } from "socket.io-client";
import Header from "../../components/Header/Header";
import "./Lobby.css";
import { useNavigate } from "react-router-dom";
import React, { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import Modal from "../../components/Modal/Modal";
import { refreshAccessToken } from "../../helper/refreshAccessToken";
import apiClient from "../../client/APIClient";
import { formatTimestamp } from "../../helper/stringHelpers";
import { MessageFormatter } from "../../components/MessageFormatter";

interface Message {
  username: string;
  profilePic: string;
  message: string;
  timestamp?: string;
}

const Lobby = () => {
  const navigate = useNavigate();

  const socketRef = useRef<Socket | null>(null);
  const chatboxRef = useRef<HTMLDivElement>(null);

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<{ [username: string]: string }>({});
  const [isCreateRoomModalOpen, setIsCreateRoomModalOpen] = useState(false);
  const [rooms, setRooms] = useState<any[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string>("");

  const openCreateRoomModal = () => {
    setIsCreateRoomModalOpen(true);
  };

  const closeCreateRoomModal = () => {
    setIsCreateRoomModalOpen(false);
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

  const registerSocketEventListeners = (socket: Socket) => {
    socket.on("currentUsers", (data) => {
      console.log("Got currentUsers");
      const currentUsers = data.reduce((acc: any, user: any) => {
        acc[user.username] = user.profilePic;
        return acc;
      }, {});

      setUsers(currentUsers);
    });

    socket.on("userJoined", (data) => {
      console.log("Got userJoined");
      setUsers((prevUsers) => {
        if (!prevUsers[data.username]) {
          return { ...prevUsers, [data.username]: data.profilePic };
        }
        return prevUsers;
      });
    });

    socket.on("userLeft", (data) => {
      console.log("Got userLeft", data);
      setUsers((prevUsers) => {
        const updatedUsers = { ...prevUsers };
        delete updatedUsers[data.username];
        return updatedUsers;
      });
    });

    socket.on("chatMessage", (data) => {
      setMessages((prevMessages) => {
        const updatedMessages = [...prevMessages, data];
        return updatedMessages.length > 100 ? updatedMessages.slice(-100) : updatedMessages;
      });
    });

    socket.on("activeRooms", (activeRooms) => {
      setRooms(activeRooms);
    });

    socket.on("gameRoomCreated", (data) => {
      setRooms((prevRooms) => [...prevRooms, data]);
    });

    socket.on("tokenExpired", async () => {
      console.log("Token expired, refreshing...");
      const newToken = await refreshAccessToken();
      if (newToken && socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = io(import.meta.env.VITE_API_URL + "/lobby", {
          auth: {
            token: newToken,
          },
        });

        registerSocketEventListeners(socketRef.current);
      }
    });
  };

  const handleCreateRoom = async () => {
    if (!roomName) {
      return;
    }

    const response: any = await apiClient.post("/game-room", { roomName });
    const { roomId } = response;

    setTimeout(() => {
      navigate(`/room/${roomId}`);
    }, 100);
  };

  const handleRoomClick = (roomId: string) => {
    setActiveRoomId(roomId);
  };

  const handleJoinRoom = () => {
    navigate(`/room/${activeRoomId}`);
  };

  const UserMessage = memo((
    { username, profilePic, message, timestamp }: { username: string, profilePic: string, message: string, timestamp: string | undefined }
  ) => {
    return (
      <div className="lobby-chat-message-container">
        <div className="lobby-chat-message">
          <div className="lobby-chat-message-avatar">
            <img
              className="user-profile-picture"
              src={profilePic}
              width={35}
              height={35}
              alt={username}
            />
          </div>

          <div className="lobby-chat-message-content">
            <div className="lobby-chat-message-user">
              <div className="lobby-chat-message-user-username">{username}</div>
              <div className="lobby-chat-message-user-timestamp">{formatTimestamp(timestamp)}</div>
            </div>
            <div className="lobby-chat-message-text">
              <MessageFormatter message={message} />
            </div>
          </div>
        </div>
      </div>
    );
  });

  const UserContinuationMessage = memo(({ message, timestamp }: { message: string, timestamp: string | undefined }) => {
    return (
      <div className="lobby-chat-message-container">
        <div className="lobby-chat-message-continuation">
          <div className="lobby-chat-message-content-continuation">
            <div className="lobby-chat-message-user-timestamp-continuation">
              {formatTimestamp(timestamp)}
            </div>
            <div className="lobby-chat-message-text-continuation">
              <MessageFormatter message={message} />
            </div>
          </div>
        </div>
      </div>
    );
  })

  const renderChatMessages = () => {
    return messages.map((msg, index) => {

      const isContinuation = index > 0 && messages[index-1].username === msg.username;

      return isContinuation ? (
        <UserContinuationMessage
          key={index}
          message={msg.message}
          timestamp={msg.timestamp}
        />
      ) : (
        <UserMessage
          key={index}
          username={msg.username}
          profilePic={msg.profilePic}
          message={msg.message}
          timestamp={msg.timestamp}
        />
      );
    })
  };

  useLayoutEffect(() => {
    if (chatboxRef.current) {
      chatboxRef.current.scrollTop = chatboxRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (socketRef.current) {
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      console.log("[Lobby] Invalid token");
      navigate("/login");
      return;
    }

    socketRef.current = io(import.meta.env.VITE_API_URL + "/lobby", {
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
    <div className="lobby-container">
      <Header />

      <div className="lobby-content">
        <div className="lobby-sidebar">
          <div className="lobby-sidebar-text">
            <h2>
              Lobby
            </h2>
          </div>

          <div className="lobby-sidebar-content">
            <div className="lobby-channels-text">
              Channels
            </div>

            <div className="lobby-channels">
              <div className="lobby-channel active"># general</div>
            </div>
          </div>
        </div>

        <div className="lobby-chat-area">
          <div className="lobby-chat-area-header">
            <div># general</div>
          </div>

          {/* TODO: Memoize the messages so they don't all re-render */}
          <div className="lobby-chat-area-messages" ref={chatboxRef}>
            {renderChatMessages()}
          </div>

          <div className="lobby-chat-area-input">
            <textarea
              placeholder="Message #general"
              maxLength={2000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
        
        </div>

        <div className="lobby-userlist">
          <div className="lobby-roomlist">
            <div className="lobby-roomlist-header">Rooms</div>
            <div className="lobby-rooms">
              {rooms.map((room, index) => (
                <div
                  key={index}
                  className={`lobby-room ${room.roomId === activeRoomId ? "active-room" : ""}`}
                  onClick={() => handleRoomClick(room.roomId)}
                >
                  {room.roomName}
                </div>
              ))}
            </div>
            <div className="lobby-room-buttons">
              {activeRoomId !== null && (
                <button onClick={handleJoinRoom}>Join Room</button>
              )}
              <button onClick={openCreateRoomModal}>Create Room</button>
            </div>
          </div>

          <div>
            <div className="lobby-users-text">Users - {Object.keys(users).length}</div>
            <div className="lobby-users">
              {Object.entries(users).map(([username, profilePic], index) => (
                <div key={index} className="lobby-user">
                  <div className="lobby-user-profile">
                    <img className="user-profile-picture" src={profilePic} width={35} height={35} alt={username}></img>
                  </div>
                  <div className="lobby-user-name">{username}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      <Modal isOpen={isCreateRoomModalOpen} onClose={closeCreateRoomModal}>
        <div className="lobby-create-room-modal">
          <h1>Create a room</h1>
          <hr />
          <div className="lobby-create-room-modal-room-name">
            <label>Room name:</label>
            <input
              name="roomName"
              onChange={(e) => setRoomName(e.target.value)}
            />
          </div>
          <button onClick={handleCreateRoom}>Create room</button>
        </div>
      </Modal>
    </div>
  );
}

export default Lobby;
