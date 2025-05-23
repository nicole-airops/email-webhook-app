import { useState, useEffect, useRef } from 'react';
import { useFrontContext } from './providers/frontContext';
import { 
  Button, 
  ButtonGroup, 
  Hoverable,
  FormFieldContainer,
  TextInput,
  Icon,
  Link,
  ListItem,
  Pill,
  ShortcutHandler,
  ShortcutEnums 
} from '@frontapp/ui-kit';
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
  
  // UI state
  const [showResizeOptions, setShowResizeOptions] = useState(false);
  const [textareaHeight, setTextareaHeight] = useState(40);
  
  const EMAIL_WEBHOOK_URL = 'https://app.airops.com/public_api/airops_apps/73407/webhook_async_execute?auth_token=pxaMrQO7aOUSOXe6gSiLNz4cF1r-E9fOS4E378ws12BBD8SPt-OIVu500KEh';
  const TASK_WEBHOOK_URL = 'https://app.airops.com/public_api/airops_apps/84946/webhook_async_execute?auth_token=pxaMrQO7aOUSOXe6gSiLNz4cF1r-E9fOS4E378ws12BBD8SPt-OIVu500KEh';
  const AIROPS_LOGO_URL = 'https://app.ashbyhq.com/api/images/org-theme-logo/78d1f89f-3e5a-4a8b-b6b5-a91acb030fed/aba001ed-b5b5-4a1b-8bd6-dfb86392876e/d8e6228c-ea82-4061-b660-d7b6c502f155.png';
  
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

  // Mode selection options
  const modeOptions = [
    { title: 'Email', value: 'email' },
    { title: 'Task', value: 'task' }
  ];

  // Function to combine instructions and output format
  const createCombinedInstructions = () => {
    let combinedText = comment.trim();
    
    if (mode === 'task' && outputFormat.trim()) {
      combinedText += `\n\nOutput Format: ${outputFormat.trim()}`;
    }
    
    return combinedText;
  };

  // Keyboard shortcuts
  const shortcutHandlers = {
    [ShortcutEnums.ENTER]: () => {
      if (comment.trim()) {
        processRequest();
      }
    },
    [ShortcutEnums.ESC]: () => {
      setComment('');
      setOutputFormat('');
    }
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
        
        const updatedHistory = [newEntry, ...commentHistory];
        setCommentHistory(updatedHistory);
        saveCommentHistoryToStorage(conversationId, updatedHistory);

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
      
      // Updated payload with combined instructions
      const payload = {
        frontData: conversationData,
        contextType: context?.type,
        userComment: combinedInstructions, // Combined instructions + output format
        mode: mode,
        ...(taskId && { taskId: taskId }),
        ...(callbackUrl && { callbackUrl: callbackUrl })
        // Note: Removed separate outputFormat field since it's now combined
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

  // Resize options
  const resizeOptions = [
    { id: 'small', title: 'Small', onPress: () => setTextareaHeight(32) },
    { id: 'medium', title: 'Medium', onPress: () => setTextareaHeight(60) },
    { id: 'large', title: 'Large', onPress: () => setTextareaHeight(100) }
  ];

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

        {/* Mode Selection using ButtonGroup */}
        <div style={{ marginBottom: '6px' }}>
          <ButtonGroup
            items={modeOptions}
            value={mode}
            onItemSelected={setMode}
          />
        </div>
        
        {/* Instructions Input with FormFieldContainer */}
        <FormFieldContainer
          label="Instructions"
          hintMessage={mode === 'email' ? "How should we respond?" : "What do you need?"}
        >
          <div style={{ position: 'relative' }}>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder={mode === 'email' ? "How should we respond?" : "What do you need?"}
              multiline={true}
              style={{ 
                height: `${textareaHeight}px`,
                minHeight: '32px',
                resize: 'none'
              }}
            />
            
            {/* Resize Controls using Hoverable */}
            <Hoverable
              onHoverIn={() => setShowResizeOptions(true)}
              onHoverOut={() => setShowResizeOptions(false)}
            >
              <div style={{
                position: 'absolute',
                bottom: '2px',
                right: '2px',
                display: 'flex',
                gap: '2px',
                opacity: showResizeOptions ? 1 : 0.3,
                transition: 'opacity 0.2s ease'
              }}>
                <Button
                  title="S"
                  onPress={() => setTextareaHeight(32)}
                  style={{ padding: '2px 4px', fontSize: '8px' }}
                />
                <Button
                  title="M"
                  onPress={() => setTextareaHeight(60)}
                  style={{ padding: '2px 4px', fontSize: '8px' }}
                />
                <Button
                  title="L"
                  onPress={() => setTextareaHeight(100)}
                  style={{ padding: '2px 4px', fontSize: '8px' }}
                />
              </div>
            </Hoverable>
          </div>
        </FormFieldContainer>

        {/* Output Format Input (Task mode only) */}
        {mode === 'task' && (
          <FormFieldContainer
            label="Output Format"
            hintMessage="Specify the desired format for the result"
          >
            <TextInput
              value={outputFormat}
              onChangeText={setOutputFormat}
              placeholder="e.g., Bullet points, Email draft, JSON..."
              iconLeft={{ name: 'tag' }}
            />
          </FormFieldContainer>
        )}
        
        {/* Send Button */}
        <Button
          title={isSending ? 'Processing...' : 'Send'}
          onPress={processRequest}
          disabled={isSending}
          type="primary"
          style={{ marginBottom: '4px' }}
        />
        
        {/* Status */}
        {status && (
          <div className="status">
            <Pill title={status} />
          </div>
        )}

        {/* Task Results */}
        {taskResults.length > 0 && (
          <div className="task-results">
            <div className="task-header">
              <Icon name="bullets-list" /> Tasks ({taskResults.length})
            </div>
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
                    <Button
                      title="Insert"
                      onPress={() => insertIntoDraft(task.result.replace(/<[^>]*>/g, ''))}
                      style={{ position: 'absolute', top: '2px', right: '2px' }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* History */}
        {commentHistory.length > 0 && (
          <div className="history">
            <ListItem
              id="history-toggle"
              title={`${showHistory ? '−' : '+'} History (${commentHistory.length})`}
              onPress={toggleHistory}
              leftComponent={<Icon name="calendar" />}
            />
            
            {showHistory && (
              <div className="history-items">
                {commentHistory.slice(0, 3).map((entry, index) => (
                  <div key={index} className="history-item">
                    <div className="history-date">
                      {formatDate(entry.timestamp)} • {entry.mode === 'email' ? '✉️' : '📋'}
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

        {/* Keyboard Shortcuts Handler */}
        <ShortcutHandler
          handlers={shortcutHandlers}
          hidden={true}
        />
      </div>
    </div>
  );
}

export default App;