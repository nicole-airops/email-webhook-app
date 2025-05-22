import { useState, useEffect } from 'react';
import { useFrontContext } from './providers/frontContext';
import './App.css';

function App() {
  const context = useFrontContext();
  const [mode, setMode] = useState('email'); // 'email' or 'task'
  const [comment, setComment] = useState('');
  const [outputFormat, setOutputFormat] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState('');
  const [commentHistory, setCommentHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [taskResults, setTaskResults] = useState([]);
  const [pollingTasks, setPollingTasks] = useState(new Set());
  
  const EMAIL_WEBHOOK_URL = 'https://app.airops.com/public_api/airops_apps/73407/webhook_async_execute?auth_token=pxaMrQO7aOUSOXe6gSiLNz4cF1r-E9fOS4E378ws12BBD8SPt-OIVu500KEh';
  const TASK_WEBHOOK_URL = 'https://app.airops.com/public_api/airops_apps/84946/webhook_async_execute?auth_token=pxaMrQO7aOUSOXe6gSiLNz4cF1r-E9fOS4E378ws12BBD8SPt-OIVu500KEh';
  const AIROPS_LOGO_URL = 'https://app.ashbyhq.com/api/images/org-theme-logo/78d1f89f-3e5a-4a8b-b6b5-a91acb030fed/aba001ed-b5b5-4a1b-8bd6-dfb86392876e/d8e6228c-ea82-4061-b660-d7b6c502f155.png';
  
  // Load comment history when conversation changes
  useEffect(() => {
    if (context && context.conversation && context.conversation.id) {
      loadCommentHistoryFromStorage(context.conversation.id);
      loadTaskResultsFromStorage(context.conversation.id);
    }
  }, [context]);

  // Polling effect for active tasks
  useEffect(() => {
    if (pollingTasks.size > 0) {
      const interval = setInterval(() => {
        pollingTasks.forEach(taskId => checkTaskStatus(taskId));
      }, 5000); // Poll every 5 seconds

      return () => clearInterval(interval);
    }
  }, [pollingTasks]);

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

  const loadTaskResultsFromStorage = (conversationId) => {
    const storageKey = `airops-tasks-${conversationId}`;
    try {
      const savedTasks = localStorage.getItem(storageKey);
      if (savedTasks) {
        const tasks = JSON.parse(savedTasks);
        setTaskResults(tasks);
        
        // Resume polling for any pending tasks
        const pendingTasks = tasks.filter(task => task.status === 'pending').map(task => task.id);
        if (pendingTasks.length > 0) {
          setPollingTasks(new Set(pendingTasks));
        }
      } else {
        setTaskResults([]);
      }
    } catch (e) {
      console.error("Error loading task results:", e);
      setTaskResults([]);
    }
  };

  const saveTaskResultsToStorage = (conversationId, tasks) => {
    const storageKey = `airops-tasks-${conversationId}`;
    try {
      localStorage.setItem(storageKey, JSON.stringify(tasks));
    } catch (e) {
      console.error("Error saving task results:", e);
    }
  };

  const checkTaskStatus = async (taskId) => {
    try {
      // This would be your Netlify function endpoint
      const response = await fetch(`/.netlify/functions/task-status?taskId=${taskId}`);
      if (response.ok) {
        const result = await response.json();
        
        if (result.status === 'completed') {
          // Update task results
          const updatedTasks = taskResults.map(task => 
            task.id === taskId 
              ? { ...task, status: 'completed', result: result.data, completedAt: new Date().toISOString() }
              : task
          );
          
          setTaskResults(updatedTasks);
          saveTaskResultsToStorage(context.conversation.id, updatedTasks);
          
          // Remove from polling
          setPollingTasks(prev => {
            const newSet = new Set(prev);
            newSet.delete(taskId);
            return newSet;
          });
          
          setStatus('Task completed successfully!');
        }
      }
    } catch (error) {
      console.error('Error checking task status:', error);
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
      // Generate task ID for tracking
      const taskId = mode === 'task' ? `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : null;
      
      // Get the conversation data
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
        
        // Create history entry
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
      
      // Choose the correct webhook based on mode
      const webhookUrl = mode === 'email' ? EMAIL_WEBHOOK_URL : TASK_WEBHOOK_URL;
      
      // Prepare webhook payload
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
        // For task mode, create a pending task entry
        const newTask = {
          id: taskId,
          comment: comment,
          outputFormat: outputFormat,
          status: 'pending',
          createdAt: new Date().toISOString(),
          user: context.teammate ? context.teammate.name : 'Unknown user'
        };
        
        const updatedTasks = [newTask, ...taskResults];
        setTaskResults(updatedTasks);
        saveTaskResultsToStorage(context.conversation.id, updatedTasks);
        
        // Start polling for this task
        setPollingTasks(prev => new Set([...prev, taskId]));
        
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

  const copyToClipboard = async (content, type = 'formatted') => {
    try {
      let textToCopy = content;
      
      if (type === 'raw' && typeof content === 'string') {
        // Strip HTML tags for raw text copy
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;
        textToCopy = tempDiv.textContent || tempDiv.innerText || content;
      }
      
      await navigator.clipboard.writeText(textToCopy);
      setStatus(`${type === 'raw' ? 'Raw text' : 'Content'} copied to clipboard!`);
      setTimeout(() => setStatus(''), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setStatus('Copied to clipboard!');
        setTimeout(() => setStatus(''), 2000);
      } catch (fallbackErr) {
        setStatus('Failed to copy to clipboard');
      }
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
          <span className="sidebar-title">Send to AirOps</span>
        </div>

        {/* Mode Toggle */}
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

        {/* Output Format Field - Only for Task Mode */}
        {mode === 'task' && (
          <div className="form-group">
            <label htmlFor="output-format">Desired output format:</label>
            <input
              id="output-format"
              type="text"
              value={outputFormat}
              onChange={(e) => setOutputFormat(e.target.value)}
              placeholder="e.g., Business case document, Contract revision summary, Executive brief..."
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

        {/* Task Results */}
        {taskResults.length > 0 && (
          <div className="results-section">
            <h3>Task Results</h3>
            {taskResults.map((task, index) => (
              <div key={task.id} className="task-result">
                <div className="task-header">
                  <span className="task-format">{task.outputFormat}</span>
                  <span className={`task-status ${task.status}`}>
                    {task.status === 'pending' ? '⏳ Processing...' : '✅ Complete'}
                  </span>
                </div>
                <div className="task-meta">
                  <span>{formatDate(task.createdAt)} • {task.user}</span>
                </div>
                {task.status === 'completed' && task.result && (
                  <div className="task-output">
                    <div className="output-header">
                      <h4>Result:</h4>
                      <div className="copy-buttons">
                        <button 
                          className="copy-btn copy-formatted"
                          onClick={() => copyToClipboard(task.result, 'formatted')}
                          title="Copy with formatting"
                        >
                          📄 Copy HTML
                        </button>
                        <button 
                          className="copy-btn copy-raw"
                          onClick={() => copyToClipboard(task.result, 'raw')}
                          title="Copy as plain text"
                        >
                          📝 Copy Text
                        </button>
                      </div>
                    </div>
                    <div className="html-content">
                      <div 
                        className="rendered-output"
                        dangerouslySetInnerHTML={{ __html: task.result }}
                      />
                    </div>
                    <details className="raw-output">
                      <summary>View Raw HTML</summary>
                      <pre className="raw-content">
                        <code>{task.result}</code>
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* History Section */}
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