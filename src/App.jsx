import { useState, useEffect, useRef } from 'react';
import { useFrontContext } from './providers/frontContext';
import './App.css';

function App() {
  const context = useFrontContext();
  const [mode, setMode] = useState('email');
  const [comment, setComment] = useState('');
  const [outputFormat, setOutputFormat] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState('');
  const [commentHistory, setCommentHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [taskResults, setTaskResults] = useState([]);
  const [pollingTasks, setPollingTasks] = useState(new Set());
  
  // Resize state
  const [cardSize, setCardSize] = useState({ width: 320, height: 400 });
  const [isResizing, setIsResizing] = useState(false);
  const cardRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const EMAIL_WEBHOOK_URL = 'https://app.airops.com/public_api/airops_apps/73407/webhook_async_execute?auth_token=pxaMrQO7aOUSOXe6gSiLNz4cF1r-E9fOS4E378ws12BBD8SPt-OIVu500KEh';
  const TASK_WEBHOOK_URL = 'https://app.airops.com/public_api/airops_apps/84946/webhook_async_execute?auth_token=pxaMrQO7aOUSOXe6gSiLNz4cF1r-E9fOS4E378ws12BBD8SPt-OIVu500KEh';
  const AIROPS_LOGO_URL = 'https://app.ashbyhq.com/api/images/org-theme-logo/78d1f89f-3e5a-4a8b-b6b5-a91acb030fed/aba001ed-b5b5-4a1b-8bd6-dfb86392876e/d8e6228c-ea82-4061-b660-d7b6c502f155.png';
  
  // Compact format options
  const formatOptions = [
    { value: '', label: 'Select format...' },
    { value: 'email', label: '📧 Email' },
    { value: 'bullets', label: '• Bullets' },
    { value: 'table', label: '📊 Table' },
    { value: 'document', label: '📄 Doc' },
    { value: 'json', label: '{ } JSON' },
    { value: 'summary', label: '📋 Summary' },
    { value: 'tasks', label: '✅ Tasks' },
    { value: 'custom', label: '✏️ Custom' }
  ];

  // Resize functionality
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      
      const rect = cardRef.current.getBoundingClientRect();
      const newWidth = Math.max(280, e.clientX - rect.left);
      const newHeight = Math.max(300, e.clientY - rect.top);
      
      setCardSize({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'nw-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleResizeStart = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const conversationId = context?.conversation?.id;
    if (conversationId) {
      loadCommentHistoryFromStorage(conversationId);
      loadTaskResultsFromStorage(conversationId);
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

  useEffect(() => {
    if (selectedFormat && selectedFormat !== 'custom') {
      const selected = formatOptions.find(opt => opt.value === selectedFormat);
      if (selected) {
        setOutputFormat(selected.label.replace(/[📧•📊📄✅📋✏️{}]/g, '').trim());
      }
    }
  }, [selectedFormat]);

  const createCombinedInstructions = () => {
    let combinedText = comment.trim();
    
    if (mode === 'task') {
      if (outputFormat.trim()) {
        combinedText += `\n\nOutput Format: ${outputFormat.trim()}`;
      }
      
      if (uploadedFile) {
        combinedText += `\n\nReference File: ${uploadedFile.name} (${uploadedFile.type}, ${(uploadedFile.size / 1024).toFixed(1)}KB)`;
        combinedText += `\nFile Content Preview: ${uploadedFile.preview || 'Binary file - see attachment'}`;
      }
    }
    
    return combinedText;
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setStatus('File too large (max 2MB)');
      return;
    }

    try {
      const fileData = {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified
      };

      if (file.type.startsWith('text/') || file.name.endsWith('.json') || file.name.endsWith('.csv')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target.result;
          fileData.preview = content.substring(0, 500) + (content.length > 500 ? '...' : '');
          setUploadedFile(fileData);
          setStatus('File uploaded');
        };
        reader.readAsText(file);
      } else {
        setUploadedFile(fileData);
        setStatus('File uploaded');
      }
    } catch (error) {
      console.error('File upload error:', error);
      setStatus('Upload failed');
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setStatus('File removed');
  };

  const loadCommentHistoryFromStorage = (conversationId) => {
    const storageKey = `airops-history-${conversationId}`;
    try {
      const savedHistory = localStorage.getItem(storageKey);
      if (savedHistory) {
        setCommentHistory(JSON.parse(savedHistory));
      }
    } catch (e) {
      console.error("Error loading history:", e);
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
        
        const pendingTasks = tasks.filter(task => task.status === 'pending').map(task => task.id);
        if (pendingTasks.length > 0) {
          setPollingTasks(new Set(pendingTasks));
        }
      }
    } catch (e) {
      console.error("Error loading task results:", e);
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
          const conversationId = context?.conversation?.id;
          if (conversationId) {
            saveTaskResultsToStorage(conversationId, updatedTasks);
          }
          
          setPollingTasks(prev => {
            const newSet = new Set(prev);
            newSet.delete(taskId);
            return newSet;
          });
          
          setStatus('Task completed!');
        }
      }
    } catch (error) {
      console.error('Error checking task status:', error);
    }
  };

  const insertIntoDraft = (content) => {
    if (context && context.draft && typeof context.insertTextIntoBody === 'function') {
      context.insertTextIntoBody(content);
      setStatus('Inserted!');
    } else if (context && typeof context.createDraft === 'function') {
      context.createDraft({
        content: {
          body: content,
          type: 'text'
        }
      });
      setStatus('Draft created!');
    } else {
      navigator.clipboard.writeText(content).then(() => {
        setStatus('Copied!');
      }).catch(() => {
        setStatus('Copy failed');
      });
    }
  };

  const processRequest = async () => {
    if (!comment.trim()) {
      setStatus('Add instructions');
      return;
    }

    if (mode === 'task' && !outputFormat.trim() && !selectedFormat) {
      setStatus('Select format');
      return;
    }
    
    setIsSending(true);
    setStatus('Processing...');
    
    try {
      const taskId = mode === 'task' ? `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : null;
      const callbackUrl = taskId ? `${window.location.origin}/api/task-callback` : null;
      
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
          outputFormat: outputFormat,
          selectedFormat: selectedFormat,
          hasFile: !!uploadedFile,
          fileName: uploadedFile?.name,
          timestamp: new Date().toISOString(),
          user: context.teammate ? context.teammate.name : 'Unknown user'
        };
        
        const updatedHistory = [newEntry, ...commentHistory];
        setCommentHistory(updatedHistory);
        saveCommentHistoryToStorage(conversationId, updatedHistory);

        if (mode === 'task' && taskId) {
          const newTask = {
            id: taskId,
            comment: comment,
            outputFormat: outputFormat,
            selectedFormat: selectedFormat,
            hasFile: !!uploadedFile,
            fileName: uploadedFile?.name,
            status: 'pending',
            createdAt: new Date().toISOString(),
            user: context.teammate ? context.teammate.name : 'Unknown user'
          };
          
          const updatedTasks = [newTask, ...taskResults];
          setTaskResults(updatedTasks);
          saveTaskResultsToStorage(conversationId, updatedTasks);
          
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
      
      const payload = {
        frontData: conversationData,
        contextType: context?.type,
        userComment: combinedInstructions,
        mode: mode,
        ...(taskId && { taskId: taskId }),
        ...(callbackUrl && { callbackUrl: callbackUrl }),
        ...(uploadedFile && { 
          fileReference: {
            name: uploadedFile.name,
            type: uploadedFile.type,
            size: uploadedFile.size,
            preview: uploadedFile.preview
          }
        })
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
        setStatus('Sent!');
      } else {
        setStatus('Task created!');
      }
      
      setComment('');
      setOutputFormat('');
      setSelectedFormat('');
      setUploadedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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

  if (!context) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100px',
        fontSize: '10px',
        color: '#9ca3af'
      }}>
        Loading...
      </div>
    );
  }

  if (context.type === 'messageComposer' && !context.conversation) {
    return (
      <div style={{
        padding: '8px',
        fontSize: '10px',
        color: '#64748b',
        textAlign: 'center'
      }}>
        Select a conversation to use this plugin
      </div>
    );
  }

  return (
    <div 
      ref={cardRef}
      style={{
        width: `${cardSize.width}px`,
        height: `${cardSize.height}px`,
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '6px',
        padding: '8px',
        fontSize: '10px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '6px',
        fontSize: '11px',
        fontWeight: '600',
        color: '#111827'
      }}>
        <img 
          src={AIROPS_LOGO_URL} 
          alt="" 
          style={{ width: '12px', height: '12px', marginRight: '4px' }}
        />
        <span>AirOps</span>
      </div>

      {/* Mode Tabs */}
      <div style={{
        display: 'flex',
        marginBottom: '6px',
        background: '#f1f5f9',
        borderRadius: '3px',
        padding: '1px'
      }}>
        <button 
          onClick={() => setMode('email')}
          style={{
            flex: 1,
            padding: '2px 6px',
            border: 'none',
            borderRadius: '2px',
            fontSize: '9px',
            fontWeight: '500',
            cursor: 'pointer',
            background: mode === 'email' ? 'white' : 'transparent',
            color: mode === 'email' ? '#1e293b' : '#64748b'
          }}
        >
          Email
        </button>
        <button 
          onClick={() => setMode('task')}
          style={{
            flex: 1,
            padding: '2px 6px',
            border: 'none',
            borderRadius: '2px',
            fontSize: '9px',
            fontWeight: '500',
            cursor: 'pointer',
            background: mode === 'task' ? 'white' : 'transparent',
            color: mode === 'task' ? '#1e293b' : '#64748b'
          }}
        >
          Task
        </button>
      </div>
      
      {/* Scrollable Content */}
      <div style={{
        height: `${cardSize.height - 80}px`,
        overflowY: 'auto',
        paddingRight: '2px'
      }}>
        {/* Instructions */}
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={mode === 'email' ? "How should we respond?" : "What do you need?"}
          style={{
            width: '100%',
            padding: '4px 6px',
            border: '1px solid #d1d5db',
            borderRadius: '3px',
            fontSize: '10px',
            fontFamily: 'inherit',
            resize: 'none',
            height: '50px',
            marginBottom: '4px'
          }}
        />

        {/* Task Mode Controls */}
        {mode === 'task' && (
          <>
            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
              style={{
                width: '100%',
                padding: '4px 6px',
                border: '1px solid #d1d5db',
                borderRadius: '3px',
                fontSize: '9px',
                fontFamily: 'inherit',
                marginBottom: '4px',
                background: 'white'
              }}
            >
              {formatOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {selectedFormat === 'custom' && (
              <input
                type="text"
                value={outputFormat}
                onChange={(e) => setOutputFormat(e.target.value)}
                placeholder="Custom format..."
                style={{
                  width: '100%',
                  padding: '4px 6px',
                  border: '1px solid #d1d5db',
                  borderRadius: '3px',
                  fontSize: '9px',
                  fontFamily: 'inherit',
                  marginBottom: '4px'
                }}
              />
            )}

            {/* File Upload */}
            <div style={{
              border: '1px dashed #d1d5db',
              borderRadius: '3px',
              padding: '4px',
              textAlign: 'center',
              background: '#fafafa',
              marginBottom: '4px'
            }}>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                accept=".txt,.csv,.json,.doc,.docx,.pdf"
                style={{ display: 'none' }}
              />
              
              {!uploadedFile ? (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#6366f1',
                    fontSize: '8px',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  📎 Add file
                </button>
              ) : (
                <div>
                  <div style={{ fontSize: '8px', color: '#374151', marginBottom: '2px' }}>
                    📎 {uploadedFile.name.length > 20 ? uploadedFile.name.substring(0, 20) + '...' : uploadedFile.name}
                  </div>
                  <button
                    onClick={removeFile}
                    style={{
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '2px',
                      fontSize: '7px',
                      padding: '1px 4px',
                      cursor: 'pointer'
                    }}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Task Results */}
        {taskResults.length > 0 && (
          <div style={{ marginBottom: '4px' }}>
            <div style={{ fontSize: '8px', color: '#64748b', fontWeight: '500', marginBottom: '3px' }}>
              Tasks ({taskResults.length})
            </div>
            {taskResults.slice(0, 2).map((task) => (
              <div key={task.id} style={{
                background: '#f8fafc',
                border: '1px solid #f1f5f9',
                borderRadius: '3px',
                padding: '3px',
                marginBottom: '2px',
                fontSize: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginBottom: '2px' }}>
                  <span>{task.status === 'pending' ? '⏳' : '✅'}</span>
                  <span style={{ flex: 1, color: '#475569' }}>
                    {task.selectedFormat ? formatOptions.find(f => f.value === task.selectedFormat)?.label?.substring(0, 10) || task.outputFormat : task.outputFormat}
                  </span>
                </div>
                {task.result && (
                  <div style={{ position: 'relative' }}>
                    <div 
                      style={{
                        fontSize: '8px',
                        color: '#475569',
                        background: 'white',
                        padding: '3px',
                        borderRadius: '2px',
                        border: '1px solid #e2e8f0',
                        maxHeight: '40px',
                        overflow: 'hidden'
                      }}
                      dangerouslySetInnerHTML={{ __html: task.result.substring(0, 100) + '...' }}
                    />
                    <button 
                      onClick={() => insertIntoDraft(task.result.replace(/<[^>]*>/g, ''))}
                      style={{
                        position: 'absolute',
                        top: '1px',
                        right: '1px',
                        background: '#64748b',
                        color: 'white',
                        border: 'none',
                        borderRadius: '2px',
                        fontSize: '7px',
                        padding: '1px 3px',
                        cursor: 'pointer'
                      }}
                    >
                      Insert
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* History */}
        {commentHistory.length > 0 && (
          <div>
            <button 
              onClick={() => setShowHistory(!showHistory)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '8px',
                color: '#64748b',
                cursor: 'pointer',
                padding: '0',
                fontFamily: 'inherit',
                fontWeight: '500',
                marginBottom: '3px'
              }}
            >
              {showHistory ? '−' : '+'} History ({commentHistory.length})
            </button>
            
            {showHistory && (
              <div style={{ maxHeight: '60px', overflowY: 'auto' }}>
                {commentHistory.slice(0, 2).map((entry, index) => (
                  <div key={index} style={{
                    padding: '3px',
                    background: '#f8fafc',
                    border: '1px solid #f1f5f9',
                    borderRadius: '3px',
                    marginBottom: '2px',
                    fontSize: '8px'
                  }}>
                    <div style={{ color: '#94a3b8', marginBottom: '1px' }}>
                      {formatDate(entry.timestamp)} • {entry.mode === 'email' ? '✉️' : '📋'}
                    </div>
                    <div style={{ color: '#475569' }}>
                      {entry.text.substring(0, 50)}...
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Section */}
      <div style={{
        position: 'absolute',
        bottom: '8px',
        left: '8px',
        right: '8px'
      }}>
        <button
          onClick={processRequest}
          disabled={isSending}
          style={{
            width: '100%',
            background: isSending ? '#9ca3af' : '#1f2937',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            padding: '6px',
            fontSize: '9px',
            fontWeight: '500',
            cursor: isSending ? 'not-allowed' : 'pointer',
            marginBottom: '3px'
          }}
        >
          {isSending ? 'Processing...' : 'Send'}
        </button>
        
        {status && (
          <div style={{
            padding: '2px 4px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '2px',
            fontSize: '7px',
            color: '#64748b',
            textAlign: 'center'
          }}>
            {status}
          </div>
        )}
      </div>

      {/* Resize Handle */}
      <div
        onMouseDown={handleResizeStart}
        style={{
          position: 'absolute',
          bottom: '2px',
          right: '2px',
          width: '10px',
          height: '10px',
          cursor: 'nw-resize',
          background: 'linear-gradient(-45deg, transparent 30%, #9ca3af 30%, #9ca3af 35%, transparent 35%, transparent 65%, #9ca3af 65%, #9ca3af 70%, transparent 70%)',
          backgroundSize: '3px 3px',
          opacity: 0.5
        }}
      />
    </div>
  );
}

export default App;