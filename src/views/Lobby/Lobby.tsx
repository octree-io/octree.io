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
            <div className="lobby-chat-message">
              <div className="lobby-chat-message-avatar">
                <img src="https://randomuser.me/api/portraits/lego/1.jpg" width={35} height={35} style={{ borderRadius: "5px" }}></img>
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
                <div className="lobby-chat-message-text">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer viverra sed nisl eget scelerisque. Vivamus risus neque, lobortis vel fringilla at, sollicitudin in magna. Sed condimentum lorem nec rutrum iaculis. Suspendisse potenti. Nulla facilisi. Maecenas a malesuada nisi, sed tempus nibh. Vivamus ut dolor et nibh lacinia interdum nec tempor mi. Nulla pellentesque lacinia mauris, eget pellentesque nibh convallis vitae. Proin commodo velit vehicula, mollis quam non, eleifend ligula. In sem neque, condimentum eu gravida vel, rhoncus eget erat. Donec ligula odio, venenatis non auctor pretium, tempor quis ligula. Sed sollicitudin ut lacus ut ornare. Donec libero est, commodo non diam vitae, eleifend consectetur nunc. In eleifend risus ac elit sagittis, in bibendum elit pellentesque. Aliquam eget elit hendrerit, egestas tellus nec, porta sapien. Vestibulum sodales at felis et hendrerit. </div>
              </div>

            </div>
          </div>

          <div className="lobby-chat-area-input">
            <textarea placeholder="Message #general" />
          </div>
        
        </div>

        <div className="lobby-userlist">
          <div className="lobby-users-text">Users</div>
          <div className="lobby-users">
            <div className="lobby-user">
              <div className="lobby-user-profile">
                <img src="https://randomuser.me/api/portraits/lego/1.jpg" width={35} height={35} style={{ borderRadius: "5px" }}></img>
              </div>
              <div className="lobby-user-name">User</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Lobby;
