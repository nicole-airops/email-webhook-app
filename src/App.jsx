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
      setStatus('Please add instructions');
      return;
    }

    if (mode === 'task' && !outputFormat.trim()) {
      setStatus('Please specify output format');
      return;
    }
    
    setIsSending(true);
    setStatus('Processing...');
    
    try {
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
      
      setStatus('Sent to AirOps!');
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
      <div className="loading">
        <div className="spinner"></div>
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="container">
        {/* Header */}
        <div className="header">
          <img src={AIROPS_LOGO_URL} alt="AirOps" className="logo" />
          <span className="title">Send to AirOps</span>
        </div>

        {/* Mode Toggle */}
        <div className="toggle">
          <button 
            className={mode === 'email' ? 'active' : ''}
            onClick={() => setMode('email')}
          >
            Email Response
          </button>
          <button 
            className={mode === 'task' ? 'active' : ''}
            onClick={() => setMode('task')}
          >
            Custom Task
          </button>
        </div>
        
        {/* Instructions */}
        <div className="field">
          <label>Instructions</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={mode === 'email' 
              ? "How should we respond to this email?"
              : "What do you need help with?"
            }
            rows="3"
          />
        </div>

        {/* Output Format - Task Mode Only */}
        {mode === 'task' && (
          <div className="field">
            <label>Output Format</label>
            <input
              type="text"
              value={outputFormat}
              onChange={(e) => setOutputFormat(e.target.value)}
              placeholder="e.g., Business case, Contract summary, Brief..."
            />
          </div>
        )}
        
        {/* Submit Button */}
        <button
          onClick={processRequest}
          disabled={isSending}
          className={`submit ${isSending ? 'loading' : ''}`}
        >
          {isSending ? 'Processing...' : 'Send to AirOps'}
        </button>
        
        {/* Status */}
        {status && <div className="status">{status}</div>}
        
        {/* History */}
        <div className="history">
          <button onClick={toggleHistory} className="history-toggle">
            {showHistory ? '▼' : '▶'} Previous ({commentHistory.length})
          </button>
          
          {showHistory && (
            <div className="history-list">
              {commentHistory.length === 0 ? (
                <div className="empty">No previous instructions</div>
              ) : (
                commentHistory.map((entry, index) => (
                  <div key={index} className="history-item">
                    <div className="history-meta">
                      <span className="date">{formatDate(entry.timestamp)}</span>
                      <span className={`mode ${entry.mode}`}>
                        {entry.mode === 'email' ? '✉️' : '📋'}
                      </span>
                    </div>
                    <div className="history-text">{entry.text}</div>
                    {entry.outputFormat && (
                      <div className="history-format">{entry.outputFormat}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;