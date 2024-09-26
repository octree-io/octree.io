import Header from "../../components/Header/Header";
import "./Lobby.css";

const Lobby = () => {
  return (
    <div className="lobby-container">
      <Header />

      <div className="lobby-content">
        <div className="lobby-sidebar">
          <div className="lobby-sidebar-text">
            <h2 style={{ margin: 0, fontSize: "18px" }}>
              Lobby
            </h2>
          </div>

          <div className="lobby-sidebar-content">
            <div className="lobby-channels-text">
              Channels
            </div>

            <div className="lobby-channels">
              <div className="lobby-channel active"># general</div>
              <div className="lobby-channel"># system-design</div>
              <div className="lobby-channel"># interviews</div>
            </div>
          </div>
        </div>

        <div className="lobby-chat-area">
          <div className="lobby-chat-area-header">
            <div># general</div>
          </div>

          <div className="lobby-chat-area-messages">

            <div className="lobby-chat-message-container">
              <div className="lobby-chat-message">
                <div className="lobby-chat-message-avatar">
                  <img className="lobby-user-profile-picture" src="https://randomuser.me/api/portraits/lego/1.jpg" width={35} height={35}></img>
                </div>

                <div className="lobby-chat-message-content">
                  <div className="lobby-chat-message-user">
                    <div className="lobby-chat-message-user-username">
                      User
                    </div>

                    <div className="lobby-chat-message-user-timestamp">
                      12:00 AM
                    </div>
                  </div>
                  <div className="lobby-chat-message-text">My name Borat! I come from glorious nation of Kazakhstan. Very nice, yes! In my country, we say, "Great success!" when we see something good. I like America. You have many fancy things, like McDonald’s and Pamela Anderson. Wow wow wee wow! Very much excite! In Kazakhstan, we make celebration by dancing with goat and drinking fermented horse milk. But in America, you have chocolate shake and hamburgers! High five! I try learn American custom, but sometimes, very confusing. You have many rules! But I like it, very much. So I say, "Thank you, America!" You make Borat happy!</div>
                </div>
              </div>
            </div>

            <div className="lobby-chat-message-container">
              <div className="lobby-chat-message-continuation">
                <div className="lobby-chat-message-content-continuation">
                  <div className="lobby-chat-message-user-timestamp-continuation">12:01 AM</div>
                  <div className="lobby-chat-message-text-continuation">This is another message</div>
                </div>
              </div>
            </div>

          </div>

          <div className="lobby-chat-area-input">
            <textarea placeholder="Message #general" />
          </div>
        
        </div>

        <div className="lobby-userlist">
          <div className="lobby-roomlist">
            <div className="lobby-roomlist-header">Rooms</div>
            <div className="lobby-rooms">
              <div className="lobby-room">Room1</div>
              <div className="lobby-room">Room2</div>
            </div>
            <div className="lobby-room-buttons">
              <button>Join Room</button>
              <button>Create Room</button>
            </div>
          </div>

          <div>
            <div className="lobby-users-text">Users</div>
            <div className="lobby-users">
              <div className="lobby-user">
                <div className="lobby-user-profile">
                  <img className="lobby-user-profile-picture" src="https://randomuser.me/api/portraits/lego/1.jpg" width={35} height={35}></img>
                </div>
                <div className="lobby-user-name">User</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Lobby;
