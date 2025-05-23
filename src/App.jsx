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
  const [debugInfo, setDebugInfo] = useState('');

  const AIROPS_LOGO_URL = 'https://app.ashbyhq.com/api/images/org-theme-logo/78d1f89f-3e5a-4a8b-b6b5-a91acb030fed/aba001ed-b5b5-4a1b-8bd6-dfb86392876e/d8e6228c-ea82-4061-b660-d7b6c502f155.png';

  useEffect(() => {
    // Debug info
    setDebugInfo(`Context: ${context ? 'loaded' : 'loading'}, Type: ${context?.type || 'none'}`);
  }, [context]);

  const processRequest = async () => {
    if (!comment.trim()) {
      setStatus('Add instructions');
      return;
    }

    setIsSending(true);
    setStatus('Processing...');
    
    try {
      // Simple test without complex logic
      setTimeout(() => {
        setStatus('Success!');
        setIsSending(false);
        setComment('');
        setOutputFormat('');
      }, 1000);
      
    } catch (error) {
      console.error('Error:', error);
      setStatus('Error: ' + error.message);
      setIsSending(false);
    }
  };

  if (!context) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading context...</p>
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

        {/* Debug info */}
        <div style={{ 
          fontSize: '9px', 
          color: '#666', 
          marginBottom: '8px',
          padding: '4px',
          background: '#f5f5f5',
          borderRadius: '3px'
        }}>
          Debug: {debugInfo}
        </div>

        {/* Simple mode tabs */}
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
              padding: '4px 8px',
              border: 'none',
              borderRadius: '3px',
              fontSize: '10px',
              cursor: 'pointer',
              background: mode === 'task' ? 'white' : 'transparent',
              color: mode === 'task' ? '#1e293b' : '#64748b'
            }}
          >
            Task
          </button>
        </div>
        
        {/* Simple textarea */}
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
            marginBottom: '6px'
          }}
        />

        {/* Output format for task mode */}
        {mode === 'task' && (
          <input
            type="text"
            value={outputFormat}
            onChange={(e) => setOutputFormat(e.target.value)}
            placeholder="Output format..."
            style={{
              width: '100%',
              padding: '6px 8px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '11px',
              fontFamily: 'inherit',
              marginBottom: '6px'
            }}
          />
        )}
        
        {/* Simple button */}
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
            marginBottom: '6px'
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
            textAlign: 'center'
          }}>
            {status}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;