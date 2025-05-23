import { useState, useEffect, useRef } from 'react';
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
  const [taskResults, setTaskResults] = useState([]);
  const [pollingTasks, setPollingTasks] = useState(new Set());
  
  // UI state for resizing and interactions
  const [showResizeOptions, setShowResizeOptions] = useState(false);
  const [textareaHeight, setTextareaHeight] = useState(40);
  const [isResizing, setIsResizing] = useState(false);
  const [activeTextarea, setActiveTextarea] = useState(null);
  
  // Refs for resizing
  const commentTextareaRef = useRef(null);
  const outputTextareaRef = useRef(null);
  
  const EMAIL_WEBHOOK_URL = 'https://app.airops.com/public_api/airops_apps/73407/webhook_async_execute?auth_token=pxaMrQO7aOUSOXe6gSiLNz4cF1r-E9fOS4E378ws12BBD8SPt-OIVu500KEh';
  const TASK_WEBHOOK_URL = 'https://app.airops.com/public_api/airops_apps/84946/webhook_async_execute?auth_token=pxaMrQO7aOUSOXe6gSiLNz4cF1r-E9fOS4E378ws12BBD8SPt-OIVu500KEh';
  const AIROPS_LOGO_URL = 'https://app.ashbyhq.com/api/images/org-theme-logo/78d1f89f-3e5a-4a8b-b6b5-a91acb030fed/aba001ed-b5b5-4a1b-8bd6-dfb86392876e/d8e6228c-ea82-4061-b660-d7b6c502f155.png';
  
  useEffect(() => {
    const conversationId = context?.conversation?.id;
    if (conversationId) {
      loadHistoryFromFrontContext();
      loadTaskResultsFromFrontContext();
    }
  }, [context]);

  useEffect(() => {
    if (pollingTasks.size > 0) {
      const interval = setInterval(() => {
        pollingTasks.forEach(taskId => checkTaskStatus(taskId));
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [pollingTasks]);

  // Custom resizer functionality
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing || !activeTextarea) return;
      
      const rect = activeTextarea.getBoundingClientRect();
      const newHeight = Math.max(32, Math.min(200, e.clientY - rect.top));
      activeTextarea.style.height = newHeight + 'px';
      setTextareaHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setActiveTextarea(null);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'nw-resize';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing, activeTextarea]);

  // Function to combine instructions and output format for AirOps
  const createCombinedInstructions = () => {
    let combinedText = comment.trim();
    
    if (mode === 'task' && outputFormat.trim()) {
      combinedText += `\n\nOutput Format: ${outputFormat.trim()}`;
    }
    
    return combinedText;
  };

  const handleResizeStart = (e, textareaRef) => {
    e.preventDefault();
    setIsResizing(true);
    setActiveTextarea(textareaRef.current);
  };

  // Load history from Front conversation context (links)
  const loadHistoryFromFrontContext = async () => {
    try {
      if (context && context.conversation) {
        const messages = await context.listMessages();
        const historyEntries = [];
        
        // Look for AirOps history links in conversation
        messages.results.forEach(message => {
          if (message.body && message.body.includes('AirOps Request:')) {
            // Parse AirOps history from message body or links
            const historyMatch = message.body.match(/AirOps Request: (.+)/);
            if (historyMatch) {
              historyEntries.push({
                text: historyMatch[1],
                timestamp: message.created_at,
                user: message.author?.name || 'Unknown',
                mode: message.body.includes('Task:') ? 'task' : 'email'
              });
            }
          }
        });
        
        setCommentHistory(historyEntries);
      }
    } catch (error) {
      console.error('Error loading history from Front:', error);
      setCommentHistory([]);
    }
  };

  // Save history to Front conversation context
  const saveHistoryToFrontContext = async (entry) => {
    try {
      if (context && context.conversation) {
        const historyText = `AirOps Request: ${entry.text}${entry.mode === 'task' ? ` | Format: ${entry.outputFormat}` : ''}`;
        
        // Add as a link to the conversation
        await context.addLink({
          name: `AirOps ${entry.mode === 'email' ? 'Email' : 'Task'} Request`,
          url: `https://app.airops.com/`, // Could link to specific workflow
          description: historyText
        });
        
        setStatus('Request saved to conversation!');
      }
    } catch (error) {
      console.error('Error saving to Front context:', error);
      // Fallback to comment if link doesn't work
      try {
        await context.createComment({
          body: `🤖 AirOps ${entry.mode === 'email' ? 'Email' : 'Task'} Request: ${entry.text}${entry.outputFormat ? ` | Format: ${entry.outputFormat}` : ''}`,
          author_id: context.teammate?.id
        });
      } catch (commentError) {
        console.error('Error adding comment:', commentError);
      }
    }
  };

  // Load task results from Front context
  const loadTaskResultsFromFrontContext = async () => {
    try {
      if (context && context.conversation) {
        const messages = await context.listMessages();
        const taskEntries = [];
        
        // Look for task results in conversation
        messages.results.forEach(message => {
          if (message.body && message.body.includes('AirOps Task Result:')) {
            const taskMatch = message.body.match(/Task ID: (\w+)/);
            if (taskMatch) {
              taskEntries.push({
                id: taskMatch[1],
                status: 'completed',
                result: message.body,
                completedAt: message.created_at
              });
            }
          }
        });
        
        setTaskResults(taskEntries);
      }
    } catch (error) {
      console.error('Error loading task results from Front:', error);
      setTaskResults([]);
    }
  };

  // Save task results to Front context
  const saveTaskResultToFrontContext = async (task) => {
    try {
      if (context && context.conversation && task.result) {
        await context.addLink({
          name: `AirOps Task Result - ${task.outputFormat}`,
          url: `https://app.airops.com/`, // Could link to specific task
          description: `Task ID: ${task.id} | Result: ${task.result.substring(0, 200)}...`
        });
        
        setStatus('Task result saved to conversation!');
      }
    } catch (error) {
      console.error('Error saving task result to Front:', error);
    }
  };

  const checkTaskStatus = async (taskId) => {
    try {
      const response = await fetch(`/api/task-status?taskId=${taskId}`);
      if (response.ok) {
        const result = await response.json();
        
        if (result.status === 'completed') {
          const updatedTasks = taskResults.map(task => 
            task.id === taskId 
              ? { ...task, status: 'completed', result: result.data, completedAt: result.completedAt }
              : task
          );
          
          setTaskResults(updatedTasks);
          
          // Save completed task to Front context
          const completedTask = updatedTasks.find(task => task.id === taskId);
          if (completedTask) {
            await saveTaskResultToFrontContext(completedTask);
          }
          
          setPollingTasks(prev => {
            const newSet = new Set(prev);
            newSet.delete(taskId);
            return newSet;
          });
          
          setStatus('Task completed and saved!');
        }
      }
    } catch (error) {
      console.error('Error checking task status:', error);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setStatus('Copied!');
      setTimeout(() => setStatus(''), 1500);
    }).catch(() => {
      setStatus('Copy failed');
    });
  };

  const insertIntoDraft = (content) => {
    if (context && context.draft && typeof context.insertTextIntoBody === 'function') {
      context.insertTextIntoBody(content);
      setStatus('Inserted into draft!');
    } else if (context && typeof context.createDraft === 'function') {
      context.createDraft({
        content: {
          body: content,
          type: 'text'
        }
      });
      setStatus('Draft created!');
    } else {
      copyToClipboard(content);
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
      const taskId = mode === 'task' ? `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : null;
      const callbackUrl = taskId ? `${window.location.origin}/api/task-callback` : null;
      
      // Create combined instructions for AirOps workflow
      const combinedInstructions = createCombinedInstructions();
      
      let conversationData = {};
      
      if (context?.conversation) {
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
        
        // Save to Front context instead of localStorage
        await saveHistoryToFrontContext(newEntry);
        
        // Update local state
        const updatedHistory = [newEntry, ...commentHistory];
        setCommentHistory(updatedHistory);

        if (mode === 'task' && taskId) {
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
          
          try {
            await fetch('/api/store-task', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ taskId, task: newTask })
            });
          } catch (blobError) {
            console.error('Error storing task in Netlify Blobs:', blobError);
          }
          
          setPollingTasks(prev => new Set([...prev, taskId]));
        }
      }
      
      if (context?.draft) {
        conversationData.draft = {
          body: context.draft.body,
          subject: context.draft.subject
        };
      }
      
      if (context?.teammate) {
        conversationData.teammate = context.teammate;
      }
      
      const webhookUrl = mode === 'email' ? EMAIL_WEBHOOK_URL : TASK_WEBHOOK_URL;
      
      // Updated payload with combined instructions
      const payload = {
        frontData: conversationData,
        contextType: context?.type,
        userComment: combinedInstructions, // Combined instructions + output format
        mode: mode,
        ...(taskId && { taskId: taskId }),
        ...(callbackUrl && { callbackUrl: callbackUrl })
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
        setStatus('Sent and saved to conversation!');
      } else {
        setStatus('Task created and saved to conversation!');
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
      return date.toLocaleDateString(undefined, { 
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
      </div>
    );
  }

  if (context.type === 'messageComposer' && !context.conversation) {
    return (
      <div className="app">
        <div className="card">
          <div className="header">
            <img src={AIROPS_LOGO_URL} alt="" className="logo" />
            <span>Send to AirOps</span>
          </div>
          <div className="status">Select a conversation to use this plugin</div>
        </div>
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
        
        <div 
          className={`textarea-container ${isResizing && activeTextarea === commentTextareaRef.current ? 'resizing' : ''}`}
          onMouseEnter={() => setShowResizeOptions(true)}
          onMouseLeave={() => setShowResizeOptions(false)}
        >
          <textarea
            ref={commentTextareaRef}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={mode === 'email' 
              ? "How should we respond?" 
              : "What do you need?"
            }
            rows="2"
            style={{ height: `${textareaHeight}px` }}
          />
          <div 
            className={`resize-handle ${isResizing && activeTextarea === commentTextareaRef.current ? 'resizing' : ''}`}
            onMouseDown={(e) => handleResizeStart(e, commentTextareaRef)}
          />
          
          {/* Quick resize buttons */}
          {showResizeOptions && (
            <div style={{
              position: 'absolute',
              top: '-25px',
              right: '0px',
              display: 'flex',
              gap: '2px',
              background: 'rgba(255,255,255,0.9)',
              padding: '2px',
              borderRadius: '3px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <button
                onClick={() => setTextareaHeight(32)}
                style={{
                  padding: '2px 6px',
                  fontSize: '9px',
                  border: 'none',
                  borderRadius: '2px',
                  background: textareaHeight === 32 ? '#6366f1' : '#64748b',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                S
              </button>
              <button
                onClick={() => setTextareaHeight(60)}
                style={{
                  padding: '2px 6px',
                  fontSize: '9px',
                  border: 'none',
                  borderRadius: '2px',
                  background: textareaHeight === 60 ? '#6366f1' : '#64748b',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                M
              </button>
              <button
                onClick={() => setTextareaHeight(100)}
                style={{
                  padding: '2px 6px',
                  fontSize: '9px',
                  border: 'none',
                  borderRadius: '2px',
                  background: textareaHeight === 100 ? '#6366f1' : '#64748b',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                L
              </button>
            </div>
          )}
        </div>

        {mode === 'task' && (
          <input
            type="text"
            value={outputFormat}
            onChange={(e) => setOutputFormat(e.target.value)}
            placeholder="Output format (will be combined with instructions)"
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

        {/* Task Results */}
        {taskResults.length > 0 && (
          <div className="task-results">
            <div className="task-header">Tasks ({taskResults.length})</div>
            {taskResults.slice(0, 3).map((task) => (
              <div key={task.id} className="task-item">
                <div className="task-meta">
                  <span className={`task-status ${task.status}`}>
                    {task.status === 'pending' ? '⏳' : '✅'}
                  </span>
                  <span className="task-format">{task.outputFormat}</span>
                  <span className="task-date">{formatDate(task.createdAt)}</span>
                </div>
                {task.result && (
                  <div className="task-result">
                    <div 
                      className="task-content"
                      dangerouslySetInnerHTML={{ __html: task.result }}
                    />
                    <button 
                      onClick={() => insertIntoDraft(task.result.replace(/<[^>]*>/g, ''))}
                      className="copy-btn"
                    >
                      Insert
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* History from Front Context */}
        {commentHistory.length > 0 && (
          <div className="history">
            <button onClick={toggleHistory} className="history-btn">
              {showHistory ? '−' : '+'} Conversation History ({commentHistory.length})
            </button>
            
            {showHistory && (
              <div className="history-items">
                {commentHistory.slice(0, 5).map((entry, index) => (
                  <div key={index} className="history-item">
                    <div className="history-date">
                      {formatDate(entry.timestamp)} • {entry.mode === 'email' ? '✉️' : '📋'} • {entry.user}
                    </div>
                    <div className="history-text">{entry.text}</div>
                    {entry.outputFormat && (
                      <div className="history-format">Format: {entry.outputFormat}</div>
                    )}
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