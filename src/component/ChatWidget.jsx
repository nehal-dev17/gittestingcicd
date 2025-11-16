import React, { useState } from 'react';
import chatIcon from '../assets/image/logo.svg';
import ChatPopup from './ChatPopup';


const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [error, setError] = useState(null);

  // ✅ Open chat and request sessionId from backend
  const openChat = async () => {
    console.log('[openChat] Button clicked');
    setError(null);

    try {
      const res = await fetch('https://donna-chatbot-service-101768782668.us-east1.run.app/generateUUID', {
        method: 'GET',
        headers: {
          "ngrok-skip-browser-warning": "true",
          "Accept": "application/json"
        }
      });

      if (!res.ok) throw new Error('Failed to fetch sessionId');

      const data = await res.json();
      console.log(data);

      if (data.uuid) {
        localStorage.setItem('chatSessionId', data.uuid);
        setSessionId(data.uuid);
        console.log('[ChatWidget] Got sessionId from backend:', data.uuid);
        setIsOpen(true);
      } else {
        throw new Error('No uuid in response');
      }
    } catch (err) {
      console.error('[ChatWidget] Error fetching sessionId:', err);
      setError('Unable to start chat session.');
    }
  };

  // Close chat function should be outside openChat
  const closeChat = () => {
    console.log('[closeChat] Closing chat');
    setIsOpen(false);
  };

  // ✅ Update sessionId if backend refreshes it
  const handleSessionUpdate = (newSessionId) => {
    if (newSessionId && newSessionId !== sessionId) {
      setSessionId(newSessionId);
      localStorage.setItem('chatSessionId', newSessionId);
      console.log('[ChatWidget] Updated sessionId from backend:', newSessionId);
    }
  };

  return (
    <div>
      {!isOpen && (
        <>
          {error && (
            <div style={{ color: 'red', marginBottom: '8px' }}>
              {error}
            </div>
          )}
          <button className="floating-btn" onClick={openChat}>
            <img src={chatIcon} alt="Chat" />
          </button>
        </>
      )}

      {isOpen && sessionId && (
        <ChatPopup
          onClose={closeChat}
          sessionId={sessionId}
          onSessionUpdate={handleSessionUpdate}
        />
      )}
    </div>
  );
};

export default ChatWidget;