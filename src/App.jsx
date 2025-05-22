import { useState, useEffect } from 'react';
import { useFrontContext } from './providers/frontContext';
import './App.css';

function App() {
  const context = useFrontContext();
  const [comment, setComment] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState('');
  const [commentHistory, setCommentHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  const WEBHOOK_URL = 'https://app.airops.com/public_api/airops_apps/73407/webhook_async_execute?auth_token=pxaMrQO7aOUSOXe6gSiLNz4cF1r-E9fOS4E378ws12BBD8SPt-OIVu500KEh';
  const AIROPS_LOGO_URL = 'https://app.ashbyhq.com/api/images/org-theme-logo/78d1f89f-3e5a-4a8b-b6b5-a91acb030fed/aba001ed-b5b5-4a1b-8bd6-dfb86392876e/d8e6228c-ea82-4061-b660-d7b6c502f155.png';
  
  // Debug available methods
  useEffect(() => {
    if (context) {
      console.log("Available context methods:", Object.keys(context));
      
      // Test if context.conversation exists
      if (context.conversation) {
        console.log("Conversation properties:", Object.keys(context.conversation));
      } else {
        console.log("No conversation in context");
      }
    }
  }, [context]);

  // Load comment history when conversation changes
  useEffect(() => {
    if (context && context.conversation && context.conversation.id) {
      loadCommentHistoryFromStorage(context.conversation.id);
    }
  }, [context]);

  // Simplified approach - use localStorage keyed by conversation ID
  const loadCommentHistoryFromStorage = (conversationId) => {
    const storageKey = `airops-history-${conversationId}`;
    try {
      const savedHistory = localStorage.getItem(storageKey);
      if (savedHistory) {
        setCommentHistory(JSON.parse(savedHistory));
      } else {
        setCommentHistory([]);
      }
    } catch (e) {
      console.error("Error loading history:", e);
      setCommentHistory([]);
    }
  };

  const saveCommentHistoryToStorage = (conversationId, history) => {
    const storageKey = `airops-history-${conversationId}`;
    try {
      localStorage.setItem(storageKey, JSON.stringify(history));
    } catch (e) {
      console.error("Error saving history:", e);
    }
  };

  const sendToAirOps = async () => {
    if (!comment.trim()) {
      setStatus('Please add some instructions first');
      return;
    }
    
    setIsSending(true);
    setStatus('Processing your request...');
    
    try {
      // Get the conversation data if available
      let conversationData = {};
      
      if (context.conversation) {
        const conversationId = context.conversation.id;
        
        // Get conversation details
        conversationData = {
          id: conversationId,
          subject: context.conversation.subject,
          status: context.conversation.status,
          recipient: context.conversation.recipient,
          tags: context.conversation.tags,
          assignee: context.conversation.assignee
        };
        
        // Attempt to get messages
        try {
          const messages = await context.listMessages();
          conversationData.messages = messages.results;
        } catch (err) {
          console.error("Couldn't fetch messages:", err);
        }
        
        // Create a new history entry
        const newEntry = {
          text: comment,
          timestamp: new Date().toISOString(),
          user: context.teammate ? context.teammate.name : 'Unknown user'
        };
        
        // Update history
        const updatedHistory = [newEntry, ...commentHistory];
        setCommentHistory(updatedHistory);
        
        // Save to localStorage
        saveCommentHistoryToStorage(conversationId, updatedHistory);
        
        // Also try to create a private comment for team visibility
        try {
          if (typeof context.createComment === 'function') {
            await context.createComment({
              body: `[AirOps Instruction] ${comment}`,
              mentionedTeammateIds: []
            });
          }
        } catch (commentError) {
          console.error("Couldn't create comment:", commentError);
        }
      }
      
      // Include draft content if available
      if (context.draft) {
        conversationData.draft = {
          body: context.draft.body,
          subject: context.draft.subject
        };
      }
      
      // Include teammate info
      if (context.teammate) {
        conversationData.teammate = context.teammate;
      }
      
      // Send to webhook
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          frontData: conversationData,
          contextType: context.type,
          userComment: comment // Including the user's comment
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      setStatus('Email sent to AirOps for processing!');
      setComment(''); // Clear the comment after successful send
    } catch (error) {
      console.error('Error:', error);
      setStatus('Error: ' + error.message);
    } finally {
      setIsSending(false);
    }
  };

  const formatDate = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString(undefined, { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit', 
        minute: '2-digit'
      });
    } catch (e) {
      return isoString;
    }
  };

  const toggleHistory = () => {
    setShowHistory(!showHistory);
  };

  return (
    <div className="airops-app">
      <div className="plugin-container">
        <div className="logo-container">
          <img 
            src={AIROPS_LOGO_URL} 
            alt="AirOps Logo" 
            className="airops-logo"
          />
        </div>
        
        <div className="header-text">
          <h2>AirOps Email Writer</h2>
          <p>Get help drafting your email response</p>
        </div>
        
        <div className="form-group">
          <label htmlFor="comment">Customization notes:</label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add any specific points you'd like to include in your response..."
            className="comment-box"
            rows="4"
          />
        </div>
        
        <button
          onClick={sendToAirOps}
          disabled={isSending}
          className={`airops-button ${isSending ? 'sending' : ''}`}
        >
          {isSending ? 'Processing...' : 'Generate Response'}
        </button>
        
        {status && <p className="status-message">{status}</p>}
        
        {/* Comment History Section */}
        <div className="history-section">
          <button 
            onClick={toggleHistory} 
            className={`history-toggle ${showHistory ? 'open' : ''}`}
          >
            {showHistory ? 'Hide History' : 'Show Previous Instructions'} 
            {commentHistory.length > 0 && ` (${commentHistory.length})`}
          </button>
          
          {showHistory && commentHistory.length > 0 && (
            <div className="history-container">
              {commentHistory.map((entry, index) => (
                <div key={index} className="history-item">
                  <div className="history-header">
                    <span className="history-date">{formatDate(entry.timestamp)}</span>
                    <span className="history-user">{entry.user}</span>
                  </div>
                  <div className="history-content">
                    {entry.text}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {showHistory && commentHistory.length === 0 && (
            <p className="no-history">No previous instructions for this conversation.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;