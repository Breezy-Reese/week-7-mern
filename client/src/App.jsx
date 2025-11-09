import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from './socket/socket';

function App() {
  const {
    isConnected,
    messages,
    users,
    typingUsers,
    connect,
    disconnect,
    sendMessage,
    sendPrivateMessage,
    setTyping,
    markAsRead,
    reactToMessage,
    sendFile,
    socket,
  } = useSocket();
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [privateMessage, setPrivateMessage] = useState('');
  const [recipient, setRecipient] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleConnect = () => {
    if (username) {
      connect(username);
    }
  };

  if (!isConnected) {
    return (
      <div className="login-container">
        <h1>Join Chat</h1>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your username"
        />
        <button onClick={handleConnect}>Join</button>
      </div>
    );
  }

  return (
    <div className="app-container">
      <h1>Socket.io Chat</h1>
      <div className="main-content">
        <div className="sidebar">
          <h2>Users Online</h2>
          <ul className="user-list">
            {users.map((user) => (
              <li key={user.id}>{user.username}</li>
            ))}
          </ul>
          <button onClick={disconnect}>Leave Chat</button>
        </div>
        <div className="chat-container">
          <div className="messages">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`message ${
                  msg.senderId === socket.id ? 'my-message' : 'other-message'
                }`}
                onClick={() => !msg.read && msg.senderId !== socket.id && markAsRead(msg.id)}
              >
                <div className="message-sender">{msg.sender}</div>
                <div className="message-content">
                  {msg.message ? (
                    <span>{msg.message}</span>
                  ) : (
                    <a href={msg.file.url} download={msg.file.name}>
                      {msg.file.name}
                    </a>
                  )}
                  {msg.read && msg.senderId === socket.id && <i> (Read)</i>}
                </div>
                <div className="message-reactions">
                  <button onClick={() => reactToMessage(msg.id, '👍')}>👍</button>
                  <button onClick={() => reactToMessage(msg.id, '❤️')}>❤️</button>
                  {msg.reactions &&
                    Object.entries(msg.reactions).map(([reaction, count]) => (
                      <span key={reaction}>
                        {reaction} {count}
                      </span>
                    ))}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="typing-indicator">
            {typingUsers.length > 0 && (
              <p>
                <i>{typingUsers.join(', ')} is typing...</i>
              </p>
            )}
          </div>
          <div className="input-container">
            <input
              type="text"
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setTyping(e.target.value !== '');
              }}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage(message) && setMessage('')}
              placeholder="Type a message..."
            />
            <button onClick={() => sendMessage(message) && setMessage('')}>Send</button>
            <input
              type="file"
              id="file-input"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (e) => {
                    sendFile({ name: file.name, url: e.target.result });
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
            <label htmlFor="file-input">
              <button component="span">Upload</button>
            </label>
          </div>
        </div>
      </div>
      <div className="private-message-container">
        <h2>Private Message</h2>
        <input
          type="text"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="Recipient ID"
        />
        <input
          type="text"
          value={privateMessage}
          onChange={(e) => setPrivateMessage(e.target.value)}
          placeholder="Private message..."
        />
        <button onClick={() => sendPrivateMessage(recipient, privateMessage)}>
          Send Private
        </button>
      </div>
    </div>
  );
}

export default App;