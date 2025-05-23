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
      setStatus('Add instructions');
      return;
    }

    if (mode === 'task' && !outputFormat.trim()) {
      setStatus('Add output format');
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
        "Front Webhook Payload": {
          frontData: conversationData,
          contextType: context.type,
          userComment: comment,
          mode: mode,
          ...(mode === 'task' && { outputFormat: outputFormat })
        }
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
      
      setStatus('Sent!');
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
      return date.toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric'
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
      </div>
    );
  }

  return (
    <div className="app">
      <div className="card">
        <div className="header">
          <img src={AIROPS_LOGO_URL} alt="" className="logo" />
          <span>Send to AirOps</span>
        </div>

        <div className="tabs">
          <button 
            className={mode === 'email' ? 'active' : ''}
            onClick={() => setMode('email')}
          >
            Email
          </button>
          <button 
            className={mode === 'task' ? 'active' : ''}
            onClick={() => setMode('task')}
          >
            Task
          </button>
        </div>
        
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={mode === 'email' 
            ? "How should we respond?" 
            : "What do you need?"
          }
          rows="2"
        />

        {mode === 'task' && (
          <input
            type="text"
            value={outputFormat}
            onChange={(e) => setOutputFormat(e.target.value)}
            placeholder="Output format..."
          />
        )}
        
        <button
          onClick={processRequest}
          disabled={isSending}
          className={`btn ${isSending ? 'loading' : ''}`}
        >
          {isSending ? '...' : 'Send'}
        </button>
        
        {status && <div className="status">{status}</div>}
        
        {commentHistory.length > 0 && (
          <div className="history">
            <button onClick={toggleHistory} className="history-btn">
              {showHistory ? '−' : '+'} {commentHistory.length}
            </button>
            
            {showHistory && (
              <div className="history-items">
                {commentHistory.slice(0, 3).map((entry, index) => (
                  <div key={index} className="history-item">
                    <div className="history-date">
                      {formatDate(entry.timestamp)} • {entry.mode === 'email' ? '✉️' : '📋'}
                    </div>
                    <div className="history-text">{entry.text}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;