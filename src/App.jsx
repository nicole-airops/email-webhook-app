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
  const fileInputRef = useRef(null);
  
  const EMAIL_WEBHOOK_URL = 'https://app.airops.com/public_api/airops_apps/73407/webhook_async_execute?auth_token=pxaMrQO7aOUSOXe6gSiLNz4cF1r-E9fOS4E378ws12BBD8SPt-OIVu500KEh';
  const TASK_WEBHOOK_URL = 'https://app.airops.com/public_api/airops_apps/84946/webhook_async_execute?auth_token=pxaMrQO7aOUSOXe6gSiLNz4cF1r-E9fOS4E378ws12BBD8SPt-OIVu500KEh';
  const AIROPS_LOGO_URL = 'https://app.ashbyhq.com/api/images/org-theme-logo/78d1f89f-3e5a-4a8b-b6b5-a91acb030fed/aba001ed-b5b5-4a1b-8bd6-dfb86392876e/d8e6228c-ea82-4061-b660-d7b6c502f155.png';
  
  // Output format options
  const formatOptions = [
    { value: '', label: 'Select format...' },
    { value: 'email', label: '📧 Email Draft' },
    { value: 'bullets', label: '• Bullet Points' },
    { value: 'table', label: '📊 Table/Spreadsheet' },
    { value: 'document', label: '📄 Document/Report' },
    { value: 'json', label: '{ } JSON Data' },
    { value: 'summary', label: '📋 Executive Summary' },
    { value: 'action-items', label: '✅ Action Items' },
    { value: 'timeline', label: '📅 Timeline/Schedule' },
    { value: 'comparison', label: '⚖️ Comparison Chart' },
    { value: 'custom', label: '✏️ Custom Format' }
  ];

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

  // Update output format when dropdown selection changes
  useEffect(() => {
    if (selectedFormat && selectedFormat !== 'custom') {
      const selected = formatOptions.find(opt => opt.value === selectedFormat);
      if (selected) {
        setOutputFormat(selected.label.replace(/[📧•📊📄✅📅⚖️✏️{}]/g, '').trim());
      }
    }
  }, [selectedFormat]);

  // Function to combine instructions, output format, and file reference
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

  // Handle file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Size limit: 2MB
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

      // If it's a text file, read the content for preview
      if (file.type.startsWith('text/') || file.name.endsWith('.json') || file.name.endsWith('.csv')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target.result;
          fileData.preview = content.substring(0, 500) + (content.length > 500 ? '...' : '');
          setUploadedFile(fileData);
          setStatus('File uploaded successfully');
        };
        reader.readAsText(file);
      } else {
        setUploadedFile(fileData);
        setStatus('File uploaded successfully');
      }
    } catch (error) {
      console.error('File upload error:', error);
      setStatus('File upload failed');
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

    if (mode === 'task' && !outputFormat.trim() && !selectedFormat) {
      setStatus('Select or enter output format');
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
      
      // Send combined instructions to AirOps
      const payload = {
        frontData: conversationData,
        contextType: context?.type,
        userComment: combinedInstructions, // Combined instructions + output format + file info
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
        setStatus('Task created! Processing...');
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

        {/* Mode Selection Tabs */}
        <div style={{ 
          display: 'flex', 
          marginBottom: '8px',
          background: '#f1f5f9',
          borderRadius: '4px',
          padding: '2px'
        }}>
          <button 
            onClick={() => setMode('email')}
            style={{
              flex: 1,
              padding: '4px 8px',
              border: 'none',
              borderRadius: '3px',
              fontSize: '10px',
              fontWeight: '500',
              cursor: 'pointer',
              background: mode === 'email' ? 'white' : 'transparent',
              color: mode === 'email' ? '#1e293b' : '#64748b',
              boxShadow: mode === 'email' ? '0 1px 2px rgba(0, 0, 0, 0.05)' : 'none'
            }}
          >
            Email
          </button>
          <button 
            onClick={() => setMode('task')}
            style={{
              flex: 1,
              padding: '4px 8px',
              border: 'none',
              borderRadius: '3px',
              fontSize: '10px',
              fontWeight: '500',
              cursor: 'pointer',
              background: mode === 'task' ? 'white' : 'transparent',
              color: mode === 'task' ? '#1e293b' : '#64748b',
              boxShadow: mode === 'task' ? '0 1px 2px rgba(0, 0, 0, 0.05)' : 'none'
            }}
          >
            Task
          </button>
        </div>
        
        {/* Instructions Textarea */}
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={mode === 'email' ? "How should we respond?" : "What do you need?"}
          style={{
            width: '100%',
            padding: '6px 8px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            fontSize: '11px',
            fontFamily: 'inherit',
            resize: 'vertical',
            minHeight: '40px',
            marginBottom: '6px',
            transition: 'border-color 0.15s ease'
          }}
          onFocus={(e) => e.target.style.borderColor = '#6366f1'}
          onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
        />

        {/* Output Format Controls (Task mode only) */}
        {mode === 'task' && (
          <div style={{ marginBottom: '6px' }}>
            {/* Format Dropdown */}
            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '11px',
                fontFamily: 'inherit',
                marginBottom: '4px',
                background: 'white',
                cursor: 'pointer'
              }}
            >
              {formatOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {/* Custom Format Input */}
            {selectedFormat === 'custom' && (
              <input
                type="text"
                value={outputFormat}
                onChange={(e) => setOutputFormat(e.target.value)}
                placeholder="Enter custom format description..."
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontFamily: 'inherit',
                  marginBottom: '4px',
                  transition: 'border-color 0.15s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
              />
            )}

            {/* File Upload */}
            <div style={{
              border: '1px dashed #d1d5db',
              borderRadius: '4px',
              padding: '8px',
              textAlign: 'center',
              background: '#fafafa'
            }}>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                accept=".txt,.csv,.json,.doc,.docx,.pdf,.png,.jpg,.jpeg"
                style={{ display: 'none' }}
              />
              
              {!uploadedFile ? (
                <div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#6366f1',
                      fontSize: '10px',
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    📎 Upload reference file
                  </button>
                  <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '2px' }}>
                    Optional: CSV, JSON, TXT, DOC, PDF, images (max 2MB)
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '10px', color: '#374151', marginBottom: '4px' }}>
                    📎 {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(1)}KB)
                  </div>
                  <button
                    onClick={removeFile}
                    style={{
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      fontSize: '9px',
                      padding: '2px 6px',
                      cursor: 'pointer'
                    }}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Send Button */}
        <button
          onClick={processRequest}
          disabled={isSending}
          style={{
            width: '100%',
            background: isSending ? '#9ca3af' : '#1f2937',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '8px',
            fontSize: '11px',
            fontWeight: '500',
            cursor: isSending ? 'not-allowed' : 'pointer',
            marginBottom: '6px',
            transition: 'background-color 0.15s ease'
          }}
          onMouseEnter={(e) => {
            if (!isSending) e.target.style.background = '#374151';
          }}
          onMouseLeave={(e) => {
            if (!isSending) e.target.style.background = '#1f2937';
          }}
        >
          {isSending ? 'Processing...' : 'Send'}
        </button>
        
        {/* Status */}
        {status && (
          <div style={{
            padding: '4px 6px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '3px',
            fontSize: '9px',
            color: '#64748b',
            textAlign: 'center',
            marginBottom: '6px'
          }}>
            {status}
        </div>
        )}

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
                  <span className="task-format">
                    {task.selectedFormat ? formatOptions.find(f => f.value === task.selectedFormat)?.label || task.outputFormat : task.outputFormat}
                    {task.hasFile && ' 📎'}
                  </span>
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
        
        {/* History */}
        {commentHistory.length > 0 && (
          <div className="history">
            <button 
              onClick={toggleHistory} 
              style={{
                background: 'none',
                border: 'none',
                fontSize: '10px',
                color: '#64748b',
                cursor: 'pointer',
                padding: '0',
                fontFamily: 'inherit',
                fontWeight: '500'
              }}
            >
              {showHistory ? '−' : '+'} History ({commentHistory.length})
            </button>
            
            {showHistory && (
              <div className="history-items">
                {commentHistory.slice(0, 3).map((entry, index) => (
                  <div key={index} className="history-item">
                    <div className="history-date">
                      {formatDate(entry.timestamp)} • {entry.mode === 'email' ? '✉️' : '📋'}
                      {entry.hasFile && ' 📎'}
                    </div>
                    <div className="history-text">{entry.text}</div>
                    {entry.outputFormat && (
                      <div className="history-format">
                        Format: {entry.selectedFormat ? formatOptions.find(f => f.value === entry.selectedFormat)?.label || entry.outputFormat : entry.outputFormat}
                      </div>
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