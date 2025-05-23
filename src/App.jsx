import { useState } from 'react';
import { useFrontContext } from './providers/frontContext';
import './App.css';

function App() {
  const context = useFrontContext();
  const [taskDescription, setTaskDescription] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState('');
  const [debugLog, setDebugLog] = useState([]);
  
  const TASK_WEBHOOK_URL = 'https://app.airops.com/public_api/airops_apps/84946/webhook_async_execute?auth_token=pxaMrQO7aOUSOXe6gSiLNz4cF1r-E9fOS4E378ws12BBD8SPt-OIVu500KEh';
  const AIROPS_LOGO_URL = 'https://app.ashbyhq.com/api/images/org-theme-logo/78d1f89f-3e5a-4a8b-b6b5-a91acb030fed/aba001ed-b5b5-4a1b-8bd6-dfb86392876e/d8e6228c-ea82-4061-b660-d7b6c502f155.png';
  
  const addDebugLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLog(prev => [`${timestamp}: ${message}`, ...prev.slice(0, 9)]);
  };

  const sendTask = async () => {
    if (!taskDescription.trim()) {
      setStatus('Please enter a task description');
      return;
    }
    
    setIsSending(true);
    setStatus('Sending task...');
    addDebugLog('🚀 Starting task webhook call');
    
    try {
      // Just send the task description as a simple string
      addDebugLog(`📝 Task description: ${taskDescription.substring(0, 50)}...`);
      addDebugLog(`🎯 Webhook URL: ${TASK_WEBHOOK_URL.substring(0, 50)}...`);
      
      const response = await fetch(TASK_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(taskDescription)
      });
      
      addDebugLog(`📈 Response status: ${response.status}`);
      
      if (response.ok) {
        const responseText = await response.text();
        addDebugLog(`✅ Success: ${responseText.substring(0, 100)}...`);
        setStatus('Task sent successfully!');
        setTaskDescription(''); // Clear the field
      } else {
        const errorText = await response.text();
        addDebugLog(`❌ Error: ${response.status} - ${errorText}`);
        setStatus(`Error: ${response.status} - ${errorText.substring(0, 100)}`);
      }
      
    } catch (error) {
      console.error('Webhook error:', error);
      addDebugLog(`💥 Network error: ${error.message}`);
      setStatus(`Network error: ${error.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      sendTask();
    }
  };

  if (!context) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '200px',
        fontSize: '12px',
        color: '#9ca3af'
      }}>
        Loading...
      </div> 
    );
  }

  return (
    <div style={{
      width: '320px',
      background: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '16px',
      fontSize: '12px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '16px',
        fontSize: '14px',
        fontWeight: '600',
        color: '#111827'
      }}>
        <img 
          src={AIROPS_LOGO_URL} 
          alt="" 
          style={{ width: '16px', height: '16px', marginRight: '8px' }}
        />
        <span>Send Task to AirOps</span>
      </div>

      {/* Task Description */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{
          display: 'block',
          fontSize: '11px',
          fontWeight: '500',
          color: '#374151',
          marginBottom: '4px'
        }}>
          Task Description
        </label>
        <textarea
          value={taskDescription}
          onChange={(e) => setTaskDescription(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="What do you need help with?"
          style={{
            width: '100%',
            height: '80px',
            padding: '8px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '12px',
            fontFamily: 'inherit',
            resize: 'vertical',
            minHeight: '60px',
            maxHeight: '200px'
          }}
        />
        <div style={{
          fontSize: '10px',
          color: '#9ca3af',
          marginTop: '2px'
        }}>
          Tip: Press Ctrl+Enter (Cmd+Enter on Mac) to send
        </div>
      </div>

      {/* Send Button */}
      <button
        onClick={sendTask}
        disabled={isSending}
        style={{
          width: '100%',
          background: isSending ? '#9ca3af' : '#1f2937',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          padding: '10px',
          fontSize: '12px',
          fontWeight: '500',
          cursor: isSending ? 'not-allowed' : 'pointer',
          marginBottom: '12px'
        }}
      >
        {isSending ? 'Sending...' : 'Send Task'}
      </button>
      
      {/* Status */}
      {status && (
        <div style={{
          padding: '8px',
          background: status.includes('Error') || status.includes('error') ? '#fef2f2' : '#f0f9ff',
          border: `1px solid ${status.includes('Error') || status.includes('error') ? '#fecaca' : '#bfdbfe'}`,
          borderRadius: '4px',
          fontSize: '11px',
          color: status.includes('Error') || status.includes('error') ? '#dc2626' : '#1e40af',
          marginBottom: '12px'
        }}>
          {status}
        </div>
      )}

      {/* Debug Log */}
      {debugLog.length > 0 && (
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '4px',
          padding: '8px',
          fontSize: '10px',
          maxHeight: '150px',
          overflowY: 'auto'
        }}>
          <div style={{ fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>
            🔍 Debug Log:
          </div>
          {debugLog.map((log, index) => (
            <div key={index} style={{ 
              color: log.includes('❌') || log.includes('💥') ? '#dc2626' : 
                     log.includes('✅') ? '#059669' : '#475569', 
              marginBottom: '2px',
              fontFamily: 'monospace',
              fontSize: '9px'
            }}>
              {log}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;