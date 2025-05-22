import { useState, useEffect } from 'react';
import { useFrontContext } from './providers/frontContext';
import './App.css';

function App() {
  const context = useFrontContext();
  const [mode, setMode] = useState('email');
  const [comment, setComment] = useState('');
  const [outputFormat, setOutputFormat] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState('');
  const [commentHistory, setCommentHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  
  const EMAIL_WEBHOOK_URL = 'https://app.airops.com/public_api/airops_apps/73407/webhook_async_execute?auth_token=pxaMrQO7aOUSOXe6gSiLNz4cF1r-E9fOS4E378ws12BBD8SPt-OIVu500KEh';
  const TASK_WEBHOOK_URL = 'https://app.airops.com/public_api/airops_apps/84946/webhook_async_execute?auth_token=pxaMrQO7aOUSOXe6gSiLNz4cF1r-E9fOS4E378ws12BBD8SPt-OIVu500KEh';
  const AIROPS_LOGO_URL = 'https://app.ashbyhq.com/api/images/org-theme-logo/78d1f89f-3e5a-4a8b-b6b5-a91acb030fed/aba001ed-b5b5-4a1b-8bd6-dfb86392876e/d8e6228c-ea82-4061-b660-d7b6c502f155.png';

  useEffect(() => {
    if (context && context.conversation && context.conversation.id) {
      loadCommentHistoryFromStorage(context.conversation.id);
    }
  }, [context]);

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

  const processRequest = async () => {
    if (!comment.trim()) {
      setStatus('Please add some instructions first');
      return;
    }

    if (mode === 'task' && !outputFormat.trim()) {
      setStatus('Please specify the desired output format');
      return;
    }
    
    setIsSending(true);
    setStatus(mode === 'email' ? 'Processing your email request...' : 'Creating your task...');
    
    try {
      const taskId = mode === 'task' ? `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : null;
      
      let conversationData = {};
      
      if (context.conversation) {
        const conversationId = context.conversation.id;
        
        conversationData = {
          id: conversationId,
          subject: context.conversation.subject,
          status: context.conversation.status,
          recipient: context.conversation.recipient,
          tags: context.conversation.tags,
          assignee: context.conversation.assignee
        };
        
        try {
          const messages = await context.listMessages();
          conversationData.messages = messages.results;
        } catch (err) {
          console.error("Couldn't fetch messages:", err);
        }
        
        const newEntry = {
          text: comment,
          mode: mode,
          outputFormat: mode === 'task' ? outputFormat : null,
          timestamp: new Date().toISOString(),
          user: context.teammate ? context.teammate.name : 'Unknown user'
        };
        
        const updatedHistory = [newEntry, ...commentHistory];
        setCommentHistory(updatedHistory);
        saveCommentHistoryToStorage(conversationId, updatedHistory);
      }
      
      if (context.draft) {
        conversationData.draft = {
          body: context.draft.body,
          subject: context.draft.subject
        };
      }
      
      if (context.teammate) {
        conversationData.teammate = context.teammate;
      }
      
      const webhookUrl = mode === 'email' ? EMAIL_WEBHOOK_URL : TASK_WEBHOOK_URL;
      
      const payload = {
        frontData: conversationData,
        contextType: context.type,
        userComment: comment,
        mode: mode,
        ...(taskId && { taskId: taskId }),
        ...(mode === 'task' && { outputFormat: outputFormat })
      };
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      if (mode === 'email') {
        setStatus('Email sent to AirOps for processing!');
      } else {
        setStatus('Task created! Processing will take ~4 minutes...');
      }
      
      setComment('');
      setOutputFormat('');
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

  if (!context) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading Front context...</p>
      </div>
    );
  }

  return (
    <div className="airops-app">
      <div className="plugin-container">
        <div className="sidebar-header">
          <img 
            src={AIROPS_LOGO_URL} 
            alt="AirOps Logo" 
            className="sidebar-logo"
          />
          <span className="sidebar-title">AI Assistant</span>
        </div>

        <div className="mode-toggle">
          <button 
            className={`toggle-btn ${mode === 'email' ? 'active' : ''}`}
            onClick={() => setMode('email')}
          >
            Email
          </button>
          <button 
            className={`toggle-btn ${mode === 'task' ? 'active' : ''}`}
            onClick={() => setMode('task')}
          >
            Task
          </button>
        </div>
        
        <div className="form-group">
          <label htmlFor="comment">Instructions:</label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={mode === 'email' 
              ? "Add any specific points you'd like to include in your response..."
              : "Describe what you need help with..."
            }
            className="comment-box"
            rows="4"
          />
        </div>

        {mode === 'task' && (
          <div className="form-group">
            <label htmlFor="output-format">Desired output format:</label>
            <input
              id="output-format"
              type="text"
              value={outputFormat}
              onChange={(e) => setOutputFormat(e.target.value)}
              placeholder="e.g., Business case document, Contract revision summary..."
              className="format-input"
            />
          </div>
        )}
        
        <button
          onClick={processRequest}
          disabled={isSending}
          className={`airops-button ${isSending ? 'sending' : ''}`}
        >
          {isSending ? 'Processing...' : (mode === 'email' ? 'Generate Response' : 'Create Task')}
        </button>
        
        {status && <p className="status-message">{status}</p>}

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
                    <span className={`history-mode ${entry.mode}`}>
                      {entry.mode === 'email' ? '✉️' : '📋'} {entry.mode}
                    </span>
                    <span className="history-user">{entry.user}</span>
                  </div>
                  <div className="history-content">
                    {entry.text}
                    {entry.outputFormat && (
                      <div className="history-format">Format: {entry.outputFormat}</div>
                    )}
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
