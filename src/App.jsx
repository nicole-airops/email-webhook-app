import { useState, useEffect, useRef } from 'react';
import { useFrontContext } from './providers/frontContext';
import { 
  Accordion, 
  AccordionSection,
  Button,
  ButtonGroup,
  Icon
} from '@frontapp/ui-kit';
import {
  SuccessIcon,
  WarningIcon,
  TaskIcon,
  EmailIcon,
  AttachmentIcon,
  CopyIcon,
  ViewIcon,
  UploadIcon,
  DocumentIcon,
  InsertIcon,
  CheckmarkIcon,
  CrossIcon
} from './CustomIcons';
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
  const [taskResults, setTaskResults] = useState([]);
  const [pollingTasks, setPollingTasks] = useState(new Set());
  const [expandedTasks, setExpandedTasks] = useState(new Set()); 
  const [expandedHistory, setExpandedHistory] = useState(new Set()); 
  
  // Compact auto-resize state
  const [cardSize, setCardSize] = useState({ width: 244, height: 360 });
  const [isResizing, setIsResizing] = useState(false);
  const [textareaHeight, setTextareaHeight] = useState(65);
  const [isTextareaResizing, setIsTextareaResizing] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  
  // Refs for functionality
  const isProcessingRef = useRef(false);
  const lastCallTimeRef = useRef(0);
  const fileInputRef = useRef(null);
  const cardRef = useRef(null);
  const textareaContainerRef = useRef(null);
  
  // WEBHOOK URLs
  const EMAIL_WEBHOOK_URL = 'https://app.airops.com/public_api/airops_apps/f124518f-2185-4e62-9520-c6ff0fc3fcb0/webhook_async_execute?auth_token=pxaMrQO7aOUSOXe6gSiLNz4cF1r-E9fOS4E378ws12BBD8SPt-OIVu500KEh';
  const TASK_WEBHOOK_URL = 'https://app.airops.com/public_api/airops_apps/a628c7d4-6b22-42af-9ded-fb01839d5e06/webhook_async_execute?auth_token=pxaMrQO7aOUSOXe6gSiLNz4cF1r-E9fOS4E378ws12BBD8SPt-OIVu500KEh';
  const AIROPS_LOGO_URL = 'https://app.ashbyhq.com/api/images/org-theme-logo/78d1f89f-3e5a-4a8b-b6b5-a91acb030fed/aba001ed-b5b5-4a1b-8bd6-dfb86392876e/d8e6228c-ea82-4061-b660-d7b6c502f155.png';
  
  // Format options
  const formatOptions = [
    { value: '', label: 'Select format...' },
    { value: 'text', label: 'Text' },
    { value: 'table', label: 'Table' }
  ];

  // ✅ Enhanced adaptive theme
  const theme = {
    colors: {
      primary: '#0f172a',
      secondary: '#475569',
      tertiary: '#94a3b8',
      background: '#f8fafc',
      surface: '#ffffff',
      border: '#e2e8f0',
      borderHover: '#cbd5e1',
      error: '#ef4444',
      success: '#22c55e',
      warning: '#f59e0b',
      info: '#3b82f6',
      accent: '#6366f1'
    },
    spacing: {
      xs: '2px',
      sm: '4px',
      md: '6px',
      lg: '8px',
      xl: '12px'
    },
    borderRadius: {
      sm: '3px',
      md: '4px',
      lg: '6px'
    },
    fontSize: {
      xs: `${Math.max(9, Math.min(11, cardSize.width / 32))}px`,
      sm: `${Math.max(10, Math.min(12, cardSize.width / 28))}px`,
      base: `${Math.max(11, Math.min(13, cardSize.width / 25))}px`,
      lg: `${Math.max(12, Math.min(14, cardSize.width / 22))}px`,
      xl: `${Math.max(13, Math.min(15, cardSize.width / 20))}px`,
      result: `${Math.max(12, Math.min(14, cardSize.width / 22))}px`
    },
    iconSize: {
      sm: Math.max(8, Math.min(12, cardSize.width / 28)),
      md: Math.max(10, Math.min(14, cardSize.width / 25)),
      lg: Math.max(12, Math.min(16, cardSize.width / 22))
    },
    shadows: {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      md: '0 2px 4px -1px rgba(0, 0, 0, 0.1)',
      lg: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    }
  };

  // ✅ Toggle functions
  const toggleTaskExpansion = (taskId) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const toggleHistoryExpansion = (historyIndex) => {
    setExpandedHistory(prev => {
      const newSet = new Set(prev);
      if (newSet.has(historyIndex)) {
        newSet.delete(historyIndex);
      } else {
        newSet.add(historyIndex);
      }
      return newSet;
    });
  };

  // ✅ FIXED: Enhanced Front context debugging based on the API definitions
  const comprehensiveContextDebug = async () => {
    console.log('🔍 COMPREHENSIVE FRONT CONTEXT DEBUG');
    console.log('=====================================');
    
    // 1. Basic context info
    console.log('1. BASIC CONTEXT:', {
      hasContext: !!context,
      contextType: context?.type,
      contextConstructor: context?.constructor?.name
    });
    
    // 2. ✅ ENHANCED: Check specific Front API methods based on the type definitions
    if (context) {
      console.log('2. FRONT API METHOD AVAILABILITY:');
      
      // Base methods that should be available on all contexts
      const baseMethods = [
        'createWidget', 'destroyWidget', 'sendHttp', 'relayHttp', 
        'authenticate', 'deauthenticate', 'openUrl', 'openUrlInPopup',
        'search', 'listTeammates', 'listInboxes', 'listChannels', 'listTags',
        'createDraft', 'updateDraft'
      ];
      
      // Context-specific methods
      const conversationMethods = [
        'addTopic', 'addLink', 'assign', 'move', 'setStatus', 'tag', 'untag', 
        'removeLink', 'fetchPath'
      ];
      
      const singleConversationMethods = [
        'fetchDraft', 'listMessages', 'listComments', 'downloadAttachment', 'listRecipients'
      ];
      
      const messageComposerMethods = [
        'downloadComposerAttachment', 'close', 'closeDraft'
      ];
      
      // Test all methods
      const allMethods = [...baseMethods, ...conversationMethods, ...singleConversationMethods, ...messageComposerMethods];
      
      const methodStatus = {};
      allMethods.forEach(method => {
        const exists = typeof context[method] === 'function';
        methodStatus[method] = exists;
        console.log(`   ${exists ? '✅' : '❌'} ${method}: ${exists ? 'Available' : 'Missing'}`);
      });
      
      console.log('3. METHOD SUMMARY:', methodStatus);
      
      // 4. ✅ ENHANCED: Check enumerable vs non-enumerable properties
      const ownProps = Object.getOwnPropertyNames(context);
      const enumerableProps = Object.keys(context);
      const prototypeProps = Object.getOwnPropertyNames(Object.getPrototypeOf(context));
      
      console.log('4. PROPERTY ANALYSIS:', {
        ownProperties: ownProps,
        enumerableProperties: enumerableProps,
        prototypeProperties: prototypeProps,
        hiddenProperties: ownProps.filter(prop => !enumerableProps.includes(prop))
      });
      
      // 5. ✅ NEW: Test function calls safely
      console.log('5. SAFE FUNCTION TESTS:');
      
      if (typeof context.listMessages === 'function' && context.conversation) {
        try {
          console.log('   Testing listMessages...');
          const messages = await context.listMessages();
          console.log(`   ✅ listMessages: ${messages?.results?.length || 0} messages loaded`);
        } catch (error) {
          console.log(`   ❌ listMessages failed: ${error.message}`);
        }
      }
      
      if (typeof context.listTeammates === 'function') {
        try {
          console.log('   Testing listTeammates...');
          const teammates = await context.listTeammates();
          console.log(`   ✅ listTeammates: ${teammates?.results?.length || 0} teammates loaded`);
        } catch (error) {
          console.log(`   ❌ listTeammates failed: ${error.message}`);
        }
      }
    }
    
    // 6. ✅ ENHANCED: Context-specific data analysis
    if (context?.conversation) {
      console.log('6. CONVERSATION CONTEXT:', {
        conversationId: context.conversation.id,
        conversationType: context.conversation.type,
        hasSubject: !!context.conversation.subject,
        hasDraft: !!context.conversation.draftId,
        hasAssignee: !!context.conversation.assignee,
        recipientCount: context.conversation.recipient ? 1 : 0,
        inboxCount: context.conversation.inboxes?.length || 0,
        tagCount: context.conversation.tags?.length || 0
      });
    }
    
    if (context?.draft) {
      console.log('7. DRAFT CONTEXT:', {
        draftId: context.draft.id,
        hasBody: !!context.draft.body,
        bodyLength: context.draft.body?.length || 0,
        isEditable: context.draft.isEditable,
        hasChannel: !!context.draft.channel,
        recipientCount: context.draft.to?.length || 0,
        hasAttachments: context.draft.content?.attachments?.length || 0
      });
    }
    
    setStatus('Enhanced debug complete - check console');
  };

  // ✅ ENHANCED: Test Front REST API with better error handling
  const testFrontRESTAPI = async () => {
    if (!context?.conversation?.id || !context?.teammate) {
      console.log('❌ FRONT API TEST: Missing conversation or teammate');
      return;
    }
    
    const conversationId = context.conversation.id;
    const teammateId = context.teammate.id;
    const teammateEmail = context.teammate.email;
    
    console.log('🧪 FRONT REST API TEST');
    console.log('====================');
    console.log('Conversation ID:', conversationId);
    console.log('Teammate ID:', teammateId);
    console.log('Teammate Email:', teammateEmail);
    
    // Test 1: Get conversation details
    try {
      const convUrl = `https://api2.frontapp.com/conversations/${conversationId}`;
      const headers = {
        "accept": "application/json",
        "authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzY29wZXMiOlsicHJvdmlzaW9uaW5nIiwicHJpdmF0ZToqIiwic2hhcmVkOioiLCJrYiJdLCJpYXQiOjE3MjkyNTY3MzYsImlzcyI6ImZyb250Iiwic3ViIjoiYzRhYzc3Y2NjN2M5NWNiNzExNzYiLCJqdGkiOiIyNWRlOWQwMzA2ZTI0NGExIn0.KocFXR3MLCqqUU80e3BRZiLo7Zz5wtbee7kxo5V0Xw4"
      };
      
      console.log('TEST 1: Getting conversation details...');
      const response = await fetch(convUrl, { headers });
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Conversation data:', {
          id: data.id,
          subject: data.subject,
          status: data.status,
          recipient: data.recipient,
          assignee: data.assignee,
          inboxes: data.inboxes,
          channel: data.channel
        });
      } else {
        const error = await response.text();
        console.log('❌ Conversation fetch failed:', error);
      }
    } catch (e) {
      console.log('❌ Conversation fetch error:', e.message);
    }
    
    setStatus('API test complete - check console');
  };

  // ✅ ENHANCED: Front context debugging with proper method detection
  useEffect(() => {
    console.log('🔍 AIROPS DEBUG: Enhanced Front context analysis:', {
      type: context?.type,
      hasConversation: !!context?.conversation,
      conversationId: context?.conversation?.id,
      hasDraft: !!context?.draft,
      draftId: context?.draft?.id,
      hasTeammate: !!context?.teammate,
      teammateId: context?.teammate?.id,
      // ✅ ENHANCED: Better method detection
      availableMethodsEnumerable: context ? Object.keys(context).filter(key => typeof context[key] === 'function') : [],
      // ✅ NEW: Check specific expected methods
      hasCreateDraft: typeof context?.createDraft === 'function',
      hasUpdateDraft: typeof context?.updateDraft === 'function',
      hasListMessages: typeof context?.listMessages === 'function',
      hasFetchDraft: typeof context?.fetchDraft === 'function',
      // ✅ NEW: Context constructor info
      contextConstructor: context?.constructor?.name,
      // ✅ NEW: Check all properties (including non-enumerable)
      allProperties: context ? Object.getOwnPropertyNames(context) : [],
      prototypeProperties: context ? Object.getOwnPropertyNames(Object.getPrototypeOf(context)) : []
    });
  }, [context]);

  // ✅ Container size detection
  useEffect(() => {
    const updateContainerSize = () => {
      if (!cardRef.current) return;
      
      const parent = cardRef.current.parentElement;
      if (!parent) return;
      
      const rect = parent.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });
    };
    
    updateContainerSize();
    
    if (window.ResizeObserver) {
      const resizeObserver = new ResizeObserver(updateContainerSize);
      const parent = cardRef.current?.parentElement;
      if (parent) {
        resizeObserver.observe(parent);
      }
      
      return () => {
        resizeObserver.disconnect();
      };
    } else {
      const handleResize = () => updateContainerSize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  // ✅ Resize handling
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isResizing && !isTextareaResizing) {
        const cardRect = cardRef.current?.getBoundingClientRect();
        if (!cardRect) return;
        
        const newWidth = e.clientX - cardRect.left;
        const newHeight = e.clientY - cardRect.top;
        
        const minWidth = 220;
        const maxWidth = 600;
        const minHeight = 300;
        const maxHeight = 800;
        
        const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
        const constrainedHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
        
        setCardSize({ width: constrainedWidth, height: constrainedHeight });
      }
      
      if (isTextareaResizing) {
        const rect = textareaContainerRef.current?.getBoundingClientRect();
        if (rect) {
          const newHeight = Math.max(35, Math.min(200, e.clientY - rect.top));
          setTextareaHeight(newHeight);
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setIsTextareaResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.body.style.pointerEvents = '';
    };

    if (isResizing || isTextareaResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('mouseleave', handleMouseUp);
      document.body.style.cursor = isTextareaResizing ? 'ns-resize' : 'nw-resize';
      document.body.style.userSelect = 'none';
      document.body.style.pointerEvents = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.body.style.pointerEvents = '';
    };
  }, [isResizing, isTextareaResizing]);

  const handleCardResizeStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
  };

  const handleTextareaResizeStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsTextareaResizing(true);
  };

  // ✅ Data loading
  useEffect(() => {
    const conversationId = context?.conversation?.id;
    
    if (conversationId) {
      console.log('🔄 AIROPS: Loading data for conversation:', conversationId);
      loadHistoryFromNetlify(conversationId);
      loadTaskResultsFromNetlify(conversationId);
    } else {
      console.log('❌ AIROPS: No conversation ID available, context type:', context?.type);
      setTaskResults([]);
      setCommentHistory([]);
    }
  }, [context]);

  // ✅ Manual refresh
  const manualRefresh = async () => {
    if (!context?.conversation?.id) {
      console.log('❌ AIROPS REFRESH: No conversation ID');
      setStatus('No conversation context');
      return;
    }

    console.log('🔄 AIROPS REFRESH: Manual refresh triggered for conversation:', context.conversation.id);
    setStatus('Refreshing...');
    
    try {
      await Promise.all([
        loadHistoryFromNetlify(context.conversation.id),
        loadTaskResultsFromNetlify(context.conversation.id)
      ]);
      setStatus('Refreshed!');
      console.log('✅ AIROPS REFRESH: Manual refresh completed');
    } catch (error) {
      console.error('❌ AIROPS REFRESH: Failed:', error);
      setStatus('Refresh failed');
    }
  };

// ✅ Add this debug function to your App component

const debugHistoryAPI = async () => {
  console.log('🧪 HISTORY API DEBUG: Testing history operations');
  
  if (!context?.conversation?.id) {
    console.error('❌ HISTORY DEBUG: No conversation ID');
    return;
  }
  
  const conversationId = context.conversation.id;
  console.log('🧪 HISTORY DEBUG: Conversation ID:', conversationId);
  console.log('🧪 HISTORY DEBUG: Current history length:', commentHistory.length);
  
  // Test 1: Load current history
  try {
    console.log('🧪 TEST 1: Loading current history...');
    const loadResponse = await fetch(`/.netlify/functions/get-conversation-history?conversationId=${conversationId}`);
    console.log('🧪 TEST 1: Load response status:', loadResponse.status);
    
    if (loadResponse.ok) {
      const loadData = await loadResponse.json();
      console.log('🧪 TEST 1: ✅ Current history from API:', {
        length: loadData.history?.length || 0,
        firstEntry: loadData.history?.[0] || null
      });
    } else {
      const errorText = await loadResponse.text();
      console.error('🧪 TEST 1: ❌ Load failed:', errorText);
    }
  } catch (error) {
    console.error('🧪 TEST 1: ❌ Load error:', error);
  }
  
  // Test 2: Save empty history (clear test)
  try {
    console.log('🧪 TEST 2: Testing clear history...');
    const clearPayload = {
      conversationId: conversationId,
      history: [],
      clearAll: true
    };
    
    const clearResponse = await fetch('/.netlify/functions/save-conversation-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clearPayload)
    });
    
    console.log('🧪 TEST 2: Clear response status:', clearResponse.status);
    
    if (clearResponse.ok) {
      const clearResult = await clearResponse.json();
      console.log('🧪 TEST 2: ✅ Clear successful:', clearResult);
    } else {
      const errorText = await clearResponse.text();
      console.error('🧪 TEST 2: ❌ Clear failed:', errorText);
    }
  } catch (error) {
    console.error('🧪 TEST 2: ❌ Clear error:', error);
  }
  
  // Test 3: Add test entry
  try {
    console.log('🧪 TEST 3: Adding test entry...');
    const testEntry = {
      text: 'Test entry from debug',
      mode: 'test',
      timestamp: new Date().toISOString(),
      user: context.teammate?.name || 'Debug User'
    };
    
    const addPayload = {
      conversationId: conversationId,
      entry: testEntry
    };
    
    const addResponse = await fetch('/.netlify/functions/save-conversation-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addPayload)
    });
    
    console.log('🧪 TEST 3: Add response status:', addResponse.status);
    
    if (addResponse.ok) {
      const addResult = await addResponse.json();
      console.log('🧪 TEST 3: ✅ Add successful:', addResult);
    } else {
      const errorText = await addResponse.text();
      console.error('🧪 TEST 3: ❌ Add failed:', errorText);
    }
  } catch (error) {
    console.error('🧪 TEST 3: ❌ Add error:', error);
  }
  
  // Reload data
  await manualRefresh();
  
  setStatus('History debug complete - check console');
};

// ✅ Add this button next to your other debug buttons:
<button
  onClick={debugHistoryAPI}
  style={{
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    color: theme.colors.tertiary,
    fontSize: theme.fontSize.lg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }}
  onMouseEnter={(e) => e.target.style.color = theme.colors.warning}
  onMouseLeave={(e) => e.target.style.color = theme.colors.tertiary}
  title="Debug history API (check console)"
>
  🗑️
</button>

  // ✅ Clear functions
  const clearAllTasks = async () => {
    if (!context?.conversation?.id) return;
    
    if (!confirm('Delete all tasks? This cannot be undone.')) return;
    
    try {
      const response = await fetch('/.netlify/functions/save-conversation-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          conversationId: context.conversation.id, 
          tasks: [] 
        })
      });
      
      if (response.ok) {
        setTaskResults([]);
        setPollingTasks(new Set());
        setExpandedTasks(new Set());
        setStatus('Tasks cleared');
      }
    } catch (error) {
      console.error('❌ AIROPS: Error clearing tasks:', error);
      setStatus('Clear failed');
    }
  };

// ✅ ENHANCED: Better history deletion with comprehensive debugging

const deleteHistoryEntry = async (entryIndex) => {
  console.log(`🗑️ AIROPS DELETE: Starting deletion process`);
  console.log(`🗑️ AIROPS DELETE: Entry index: ${entryIndex}`);
  console.log(`🗑️ AIROPS DELETE: Current history length: ${commentHistory.length}`);
  console.log(`🗑️ AIROPS DELETE: Conversation ID: ${context?.conversation?.id}`);
  
  if (!context?.conversation?.id) {
    console.error('❌ AIROPS DELETE: No conversation ID available');
    setStatus('❌ No conversation context');
    return;
  }
  
  if (entryIndex < 0 || entryIndex >= commentHistory.length) {
    console.error(`❌ AIROPS DELETE: Invalid index ${entryIndex} for array length ${commentHistory.length}`);
    setStatus('❌ Invalid entry index');
    return;
  }
  
  const entryToDelete = commentHistory[entryIndex];
  console.log(`🗑️ AIROPS DELETE: Entry to delete:`, {
    index: entryIndex,
    timestamp: entryToDelete.timestamp,
    user: entryToDelete.user,
    mode: entryToDelete.mode,
    textLength: entryToDelete.text?.length || 0
  });
  
  try {
    // Create updated history array
    const updatedHistory = commentHistory.filter((_, index) => index !== entryIndex);
    console.log(`🗑️ AIROPS DELETE: Updated history length: ${updatedHistory.length}`);
    
    const payload = { 
      conversationId: context.conversation.id, 
      history: updatedHistory 
    };
    
    console.log(`🗑️ AIROPS DELETE: API payload:`, {
      conversationId: payload.conversationId,
      historyLength: payload.history.length,
      url: '/.netlify/functions/save-conversation-history'
    });
    
    // Make API call
    const response = await fetch('/.netlify/functions/save-conversation-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    console.log(`🗑️ AIROPS DELETE: API response status: ${response.status}`);
    console.log(`🗑️ AIROPS DELETE: API response ok: ${response.ok}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log(`✅ AIROPS DELETE: API success response:`, result);
      
      // ✅ Update local state
      setCommentHistory(updatedHistory);
      console.log(`✅ AIROPS DELETE: Local state updated to ${updatedHistory.length} entries`);
      
      // ✅ Update expanded history indices
      setExpandedHistory(prev => {
        const newSet = new Set();
        for (const expandedIndex of prev) {
          if (expandedIndex < entryIndex) {
            newSet.add(expandedIndex);
          } else if (expandedIndex > entryIndex) {
            newSet.add(expandedIndex - 1);
          }
          // Skip the deleted index
        }
        console.log(`✅ AIROPS DELETE: Updated expanded indices:`, Array.from(newSet));
        return newSet;
      });
      
      setStatus(`✅ Entry deleted (${updatedHistory.length} remain)`);
      
    } else {
      const errorText = await response.text();
      console.error(`❌ AIROPS DELETE: API failed - Status: ${response.status}`);
      console.error(`❌ AIROPS DELETE: Error response:`, errorText);
      
      // Try to parse error details
      try {
        const errorJson = JSON.parse(errorText);
        console.error(`❌ AIROPS DELETE: Error details:`, errorJson);
      } catch (e) {
        console.error(`❌ AIROPS DELETE: Raw error text:`, errorText);
      }
      
      setStatus(`❌ Delete failed (${response.status})`);
    }
    
  } catch (error) {
    console.error('❌ AIROPS DELETE: Network/JS error:', error);
    console.error('❌ AIROPS DELETE: Error stack:', error.stack);
    setStatus('❌ Delete failed - network error');
  }
};

// ✅ ENHANCED: Clear all history with better debugging
const clearHistory = async () => {
  console.log(`🗑️ AIROPS CLEAR ALL: Starting clear all process`);
  console.log(`🗑️ AIROPS CLEAR ALL: Current history length: ${commentHistory.length}`);
  console.log(`🗑️ AIROPS CLEAR ALL: Conversation ID: ${context?.conversation?.id}`);
  
  if (!context?.conversation?.id) {
    console.error('❌ AIROPS CLEAR ALL: No conversation ID');
    setStatus('❌ No conversation context');
    return;
  }
  
  if (!confirm(`Delete all ${commentHistory.length} history entries? This cannot be undone.`)) {
    console.log('🗑️ AIROPS CLEAR ALL: User cancelled');
    return;
  }
  
  try {
    const payload = { 
      conversationId: context.conversation.id, 
      history: [],
      clearAll: true // Explicit flag for clearing
    };
    
    console.log(`🗑️ AIROPS CLEAR ALL: API payload:`, payload);
    
    const response = await fetch('/.netlify/functions/save-conversation-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    console.log(`🗑️ AIROPS CLEAR ALL: API response status: ${response.status}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log(`✅ AIROPS CLEAR ALL: API success:`, result);
      
      setCommentHistory([]);
      setExpandedHistory(new Set());
      setStatus('✅ All history cleared');
      console.log(`✅ AIROPS CLEAR ALL: Local state cleared`);
      
    } else {
      const errorText = await response.text();
      console.error(`❌ AIROPS CLEAR ALL: API failed:`, response.status, errorText);
      setStatus(`❌ Clear failed (${response.status})`);
    }
    
  } catch (error) {
    console.error('❌ AIROPS CLEAR ALL: Error:', error);
    setStatus('❌ Clear failed - network error');
  }
};

  const deleteTask = async (taskId) => {
    if (!context?.conversation?.id) return;
    
    try {
      const updatedTasks = taskResults.filter(task => task.id !== taskId);
      
      const response = await fetch('/.netlify/functions/save-conversation-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          conversationId: context.conversation.id, 
          tasks: updatedTasks 
        })
      });
      
      if (response.ok) {
        setTaskResults(updatedTasks);
        setPollingTasks(prev => {
          const newSet = new Set(prev);
          newSet.delete(taskId);
          return newSet;
        });
        setExpandedTasks(prev => {
          const newSet = new Set(prev);
          newSet.delete(taskId);
          return newSet;
        });
        setStatus('Task deleted');
      }
    } catch (error) {
      console.error('❌ AIROPS: Error deleting task:', error);
      setStatus('Delete failed');
    }
  };

  // ✅ Save/load functions
  const saveTaskResultsToNetlify = async (conversationId, tasks) => {
    try {
      const response = await fetch('/.netlify/functions/save-conversation-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, tasks })
      });
      
      if (response.ok) {
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ AIROPS: Error saving tasks:', error);
      return false;
    }
  };

  const checkTaskStatus = async (taskId) => {
    try {
      const response = await fetch(`/.netlify/functions/task-status?taskId=${taskId}`);
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.status === 'completed' || result.status === 'failed') {
          const updatedTasks = taskResults.map(task => 
            task.id === taskId 
              ? { 
                  ...task, 
                  status: result.status, 
                  result: result.data, 
                  completedAt: result.completedAt,
                  error: result.error 
                }
              : task
          );
          
          setTaskResults(updatedTasks);
          
          if (result.status === 'completed') {
            setExpandedTasks(prev => new Set([...prev, taskId]));
          }
          
          if (context?.conversation?.id) {
            await saveTaskResultsToNetlify(context.conversation.id, updatedTasks);
          }
          
          setPollingTasks(prev => {
            const newSet = new Set(prev);
            newSet.delete(taskId);
            return newSet;
          });
          
          setStatus(`Task ${result.status}!`);
          return true;
        }
      }
    } catch (error) {
      console.error(`❌ AIROPS POLLING: Error checking task ${taskId}:`, error);
    }
    return false;
  };

  // ✅ Polling system
  useEffect(() => {
    if (pollingTasks.size > 0) {
      const checkAllTasks = async () => {
        const tasksToCheck = Array.from(pollingTasks);
        
        for (const taskId of tasksToCheck) {
          try {
            await checkTaskStatus(taskId);
            await new Promise(resolve => setTimeout(resolve, 200));
          } catch (error) {
            console.error(`❌ AIROPS POLLING: Error checking task ${taskId}:`, error);
          }
        }
      };
      
      const initialTimeout = setTimeout(checkAllTasks, 3000);
      const interval = setInterval(checkAllTasks, 8000);
      
      return () => {
        clearTimeout(initialTimeout);
        clearInterval(interval);
      };
    }
  }, [pollingTasks, taskResults, context]);

  useEffect(() => {
    if (selectedFormat) {
      const selected = formatOptions.find(opt => opt.value === selectedFormat);
      if (selected) {
        setOutputFormat(selected.label);
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
        
        if (uploadedFile.fullContent) {
          combinedText += `\n\nFull File Content:\n${uploadedFile.fullContent}`;
        } else if (uploadedFile.preview) {
          combinedText += `\n\nFile Content Preview:\n${uploadedFile.preview}`;
        }
      }
    }
    
    return combinedText;
  };

  const createCompletePayload = async (combinedInstructions, taskId = null) => {
    const timestamp = new Date().toISOString();
    const callbackUrl = taskId ? `${window.location.origin}/.netlify/functions/task-completion-webhook` : null;
    
    let conversationData = {};
    let messagesData = [];
    
    if (context?.conversation) {
      conversationData = {
        id: context.conversation.id,
        subject: context.conversation.subject || 'No Subject',
        status: context.conversation.status,
        created_at: context.conversation.created_at,
        updated_at: context.conversation.updated_at,
        tags: context.conversation.tags || [],
        assignee: context.conversation.assignee,
        recipient: context.conversation.recipient,
        participants: context.conversation.participants || [],
        channel: context.conversation.channel
      };
      
      try {
        if (typeof context.listMessages === 'function') {
          const messages = await context.listMessages();
          messagesData = messages.results.map(msg => ({
            id: msg.id,
            type: msg.type,
            body: msg.body,
            subject: msg.subject,
            author: msg.author,
            recipients: msg.recipients || [],
            created_at: msg.created_at,
            updated_at: msg.updated_at,
            is_inbound: msg.is_inbound,
            is_draft: msg.is_draft,
            attachments: msg.attachments || []
          }));
        }
      } catch (err) {
        console.error('❌ AIROPS: Error loading messages:', err);
        messagesData = [];
      }
    }
    
    let draftData = null;
    if (context?.draft) {
      draftData = {
        id: context.draft.id,
        body: context.draft.body,
        subject: context.draft.subject,
        to: context.draft.to,
        cc: context.draft.cc,
        bcc: context.draft.bcc
      };
    }
    
    const teammateData = context?.teammate ? {
      id: context.teammate.id,
      name: context.teammate.name,
      email: context.teammate.email
    } : null;
    
    return {
      airops_request: {
        combined_instructions: combinedInstructions,
        output_format: {
          selected_format: selectedFormat,
          format_label: selectedFormat ? formatOptions.find(f => f.value === selectedFormat)?.label : null,
          raw_instructions: comment
        },
        attachment: uploadedFile ? {
          name: uploadedFile.name,
          type: uploadedFile.type,
          size: uploadedFile.size,
          content_preview: uploadedFile.preview || null,
          full_content: uploadedFile.fullContent || null
        } : null,
        request_info: {
          mode: mode,
          timestamp: timestamp,
          plugin_context: context?.type,
          task_id: taskId,
          callback_url: callbackUrl,
          conversation_id: context?.conversation?.id,
          requesting_user_id: context?.teammate?.id
        },
        requesting_user: teammateData,
        front_conversation: {
          conversation: conversationData,
          messages: messagesData,
          current_draft: draftData
        }
      }
    };
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

      const isTextFile = file.type.startsWith('text/') || 
                        file.name.match(/\.(txt|csv|json|md|xml|log|js|jsx|ts|tsx|py|html|css|yaml|yml|sql|sh|bat|dockerfile|gitignore|env)$/i);
      
      if (isTextFile) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target.result;
          const previewLength = Math.min(8000, content.length);
          fileData.preview = content.substring(0, previewLength) + 
                           (content.length > previewLength ? 
                             '\n\n[File preview truncated - full content available to AI]' : '');
          fileData.fullContent = content;
          fileData.isProcessed = true;
          
          setUploadedFile(fileData);
          setStatus('File uploaded and processed');
        };
        reader.readAsText(file);
      } else {
        fileData.preview = `[Binary file: ${file.name}]\nType: ${file.type}\nSize: ${(file.size / 1024).toFixed(1)}KB`;
        fileData.isProcessed = true;
        setUploadedFile(fileData);
        setStatus('File uploaded');
      }
      
    } catch (error) {
      console.error('❌ AIROPS: File upload error:', error);
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

  const loadHistoryFromNetlify = async (conversationId) => {
    try {
      const response = await fetch(`/.netlify/functions/get-conversation-history?conversationId=${conversationId}`);
      
      if (response.ok) {
        const { history } = await response.json();
        if (history && Array.isArray(history)) {
          setCommentHistory(history);
        }
      }
    } catch (error) {
      console.error('❌ AIROPS: Error loading history:', error);
      setCommentHistory([]);
    }
  };

  const saveHistoryToNetlify = async (conversationId, entry) => {
    try {
      const response = await fetch('/.netlify/functions/save-conversation-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, entry })
      });
      
      if (response.ok) {
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ AIROPS: Network error saving history:', error);
      return false;
    }
  };

  const loadTaskResultsFromNetlify = async (conversationId) => {
    try {
      const response = await fetch(`/.netlify/functions/get-conversation-tasks?conversationId=${conversationId}`);
      
      if (response.ok) {
        const { tasks } = await response.json();
        if (tasks && Array.isArray(tasks)) {
          setTaskResults(tasks);
          
          const completedTaskIds = tasks.filter(task => task.status === 'completed').map(task => task.id);
          if (completedTaskIds.length > 0) {
            setExpandedTasks(prev => {
              const newSet = new Set(prev);
              completedTaskIds.forEach(taskId => newSet.add(taskId));
              return newSet;
            });
          }
          
          const pendingTasks = tasks.filter(task => task.status === 'pending').map(task => task.id);
          if (pendingTasks.length > 0) {
            setPollingTasks(new Set(pendingTasks));
          }
        }
      }
    } catch (error) {
      console.error('❌ AIROPS: Error loading tasks:', error);
      setTaskResults([]);
    }
  };

// ✅ FIXED: Enhanced draft insertion with correct payload structures
const insertIntoDraft = async (content) => {
  console.log('🔍 AIROPS INSERT: Starting draft insertion process');
  console.log('🔍 AIROPS INSERT: Content length:', content.length);
  console.log('🔍 AIROPS INSERT: Content preview:', content.substring(0, 200) + '...');
  
  if (!context) {
    console.log('❌ AIROPS INSERT: No context available');
    copyToClipboard(content);
    setStatus('Copied to clipboard (no context)');
    return;
  }

  // ✅ STRATEGY 1: Use Front context createDraft with CORRECT structure
  if (typeof context.createDraft === 'function') {
    console.log('🎯 AIROPS INSERT: Trying Front createDraft method');
    try {
      const draftTemplate = {
        content: {
          body: content,
          type: 'html' // or 'text' if content is plain text
        }
      };
      
      console.log('🎯 AIROPS INSERT: Draft template:', draftTemplate);
      
      const result = await context.createDraft(draftTemplate);
      console.log('✅ AIROPS INSERT: Draft created successfully:', result);
      setStatus('Draft created via Front API!');
      return;
    } catch (error) {
      console.error('❌ AIROPS INSERT: createDraft failed:', error);
      console.error('❌ AIROPS INSERT: Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
  }

  // ✅ STRATEGY 2: Use Front context updateDraft with CORRECT structure
  if (typeof context.updateDraft === 'function' && context.draft?.id) {
    console.log('🎯 AIROPS INSERT: Trying Front updateDraft method');
    console.log('🎯 AIROPS INSERT: Current draft ID:', context.draft.id);
    console.log('🎯 AIROPS INSERT: Current draft body length:', context.draft.content?.body?.length || 0);
    
    try {
      const existingBody = context.draft.content?.body || '';
      const newBody = existingBody + (existingBody ? '\n\n' : '') + content;
      
      const updatePayload = {
        updateMode: 'replace', // or 'insert' depending on behavior you want
        content: {
          body: newBody,
          type: 'html' // or 'text' if content is plain text  
        }
      };
      
      console.log('🎯 AIROPS INSERT: Update payload:', {
        updateMode: updatePayload.updateMode,
        contentType: updatePayload.content.type,
        bodyLength: updatePayload.content.body.length
      });
      
      await context.updateDraft(context.draft.id, updatePayload);
      console.log('✅ AIROPS INSERT: Draft updated successfully');
      setStatus('Draft updated via Front API!');
      return;
    } catch (error) {
      console.error('❌ AIROPS INSERT: updateDraft failed:', error);
      console.error('❌ AIROPS INSERT: Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
  }

  // ✅ STRATEGY 3: Front REST API with CORRECT payload
  if (context?.conversation?.id && context?.teammate) {
    console.log('🎯 AIROPS INSERT: Trying Front REST API');
    
    try {
      const conversationId = context.conversation.id;
      const teammateId = context.teammate.id;
      const teammateEmail = context.teammate.email;
      
      // ✅ Better channel ID detection
      const channelFormats = [
        context.conversation.channel?.id, // Try conversation's channel first
        `alt:address:${teammateEmail}`,
        teammateEmail
      ].filter(Boolean);
      
      for (const channelId of channelFormats) {
        const url = `https://api2.frontapp.com/conversations/${conversationId}/drafts`;
        
        const headers = {
          "accept": "application/json",
          "content-type": "application/json",
          "authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzY29wZXMiOlsicHJvdmlzaW9uaW5nIiwicHJpdmF0ZToqIiwic2hhcmVkOioiLCJrYiJdLCJpYXQiOjE3MjkyNTY3MzYsImlzcyI6ImZyb250Iiwic3ViIjoiYzRhYzc3Y2NjN2M5NWNiNzExNzYiLCJqdGkiOiIyNWRlOWQwMzA2ZTI0NGExIn0.KocFXR3MLCqqUU80e3BRZiLo7Zz5wtbee7kxo5V0Xw4"
        };
        
        // ✅ FIXED: Correct REST API payload structure
        const payload = {
          author_id: teammateId,
          body: content,
          channel_id: channelId,
          should_add_default_signature: false // Try without signature first
        };
        
        console.log(`🎯 AIROPS INSERT: Trying API with channel: ${channelId}`);
        console.log(`🎯 AIROPS INSERT: Payload:`, {
          author_id: teammateId,
          channel_id: channelId,
          bodyLength: content.length,
          should_add_default_signature: payload.should_add_default_signature
        });
        
        const response = await fetch(url, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(payload)
        });
        
        console.log(`🎯 AIROPS INSERT: API response status: ${response.status}`);
        
        if (response.ok) {
          const result = await response.json();
          console.log('✅ AIROPS INSERT: Draft created successfully via API:', result);
          setStatus('Draft created via REST API!');
          return;
        } else {
          const errorText = await response.text();
          console.error(`❌ AIROPS INSERT: API failed for ${channelId}:`, {
            status: response.status,
            statusText: response.statusText,
            error: errorText
          });
        }
      }
      
    } catch (error) {
      console.error('❌ AIROPS INSERT: REST API error:', error);
    }
  }
  
  // ✅ FALLBACK: Copy to clipboard with better feedback
  console.log('📋 AIROPS INSERT: All methods failed, copying to clipboard');
  copyToClipboard(content);
  setStatus('Copied - Front API unavailable');
};

// ✅ ALSO: Add this debug function to test draft operations
const debugDraftAPI = async () => {
  console.log('🧪 DRAFT DEBUG: Testing draft operations');
  
  if (!context) {
    console.log('❌ DRAFT DEBUG: No context');
    return;
  }
  
  console.log('🧪 DRAFT DEBUG: Context info:', {
    type: context.type,
    conversationId: context.conversation?.id,
    draftId: context.draft?.id,
    hasCreateDraft: typeof context.createDraft === 'function',
    hasUpdateDraft: typeof context.updateDraft === 'function',
    channelId: context.conversation?.channel?.id,
    teammateId: context.teammate?.id,
    teammateEmail: context.teammate?.email
  });
  
  // Test with simple content
  const testContent = "<p>Test draft content from AirOps plugin</p>";
  
  if (typeof context.createDraft === 'function') {
    try {
      console.log('🧪 DRAFT DEBUG: Testing createDraft...');
      const result = await context.createDraft({
        content: {
          body: testContent,
          type: 'html'
        }
      });
      console.log('✅ DRAFT DEBUG: createDraft successful:', result);
    } catch (error) {
      console.error('❌ DRAFT DEBUG: createDraft failed:', error);
    }
  }
  
  if (typeof context.updateDraft === 'function' && context.draft?.id) {
    try {
      console.log('🧪 DRAFT DEBUG: Testing updateDraft...');
      const result = await context.updateDraft(context.draft.id, {
        updateMode: 'insert',
        content: {
          body: testContent,
          type: 'html'
        }
      });
      console.log('✅ DRAFT DEBUG: updateDraft successful:', result);
    } catch (error) {
      console.error('❌ DRAFT DEBUG: updateDraft failed:', error);
    }
  }
};

  const copyToClipboard = (content) => {
    // Convert HTML to clean text
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    
    // Enhanced HTML to text conversion
    tempDiv.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
    tempDiv.querySelectorAll('p').forEach(p => p.replaceWith(p.textContent + '\n\n'));
    tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(h => h.replaceWith('# ' + h.textContent + '\n\n'));
    tempDiv.querySelectorAll('li').forEach(li => li.replaceWith('• ' + li.textContent + '\n'));
    tempDiv.querySelectorAll('ul, ol').forEach(list => list.replaceWith(list.textContent + '\n\n'));
    
    // Enhanced table handling
    tempDiv.querySelectorAll('table').forEach(table => {
      let tableText = '';
      const rows = table.querySelectorAll('tr');
      rows.forEach((row, index) => {
        const cells = Array.from(row.querySelectorAll('td, th')).map(cell => cell.textContent.trim());
        tableText += cells.join(' | ') + '\n';
        
        if (index === 0 && row.querySelector('th')) {
          tableText += cells.map(() => '---').join(' | ') + '\n';
        }
      });
      table.replaceWith(tableText + '\n');
    });
    
    const cleanContent = tempDiv.textContent || tempDiv.innerText || content.replace(/<[^>]*>/g, '');
    
    // Modern clipboard API with fallback
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(cleanContent).then(() => {
        setStatus('Copied!');
      }).catch(() => {
        fallbackCopy(cleanContent);
      });
    } else {
      fallbackCopy(cleanContent);
    }
    
    function fallbackCopy(text) {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const result = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        setStatus(result ? 'Copied!' : 'Copy failed');
      } catch (err) {
        setStatus('Copy failed');
      }
    }
  };

  const processRequest = async () => {
    const now = Date.now();
    if (isProcessingRef.current || (now - lastCallTimeRef.current) < 1000) {
      return;
    }

    if (!comment.trim()) {
      setStatus('Add instructions');
      return;
    }
    
    isProcessingRef.current = true;
    lastCallTimeRef.current = now;
    setIsSending(true);
    setStatus('Processing...');
    
    try {
      const taskId = mode === 'task' ? `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : null;
      
      const combinedInstructions = createCombinedInstructions();
      const payload = await createCompletePayload(combinedInstructions, taskId);
      
      if (context?.conversation) {
        const conversationId = context.conversation.id;
        
        // Save history entry
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
        
        const historySaved = await saveHistoryToNetlify(conversationId, newEntry);
        if (historySaved) {
          setCommentHistory([newEntry, ...commentHistory]);
        }

        // Create and save task if in task mode
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
          
          // Save to storage
          try {
            await fetch('/.netlify/functions/store-task', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ taskId, task: newTask })
            });
            
            await saveTaskResultsToNetlify(conversationId, updatedTasks);
          } catch (storageError) {
            console.error('❌ AIROPS: Storage error:', storageError);
          }
          
          // Start polling
          setPollingTasks(prev => new Set([...prev, taskId]));
        }
      }
      
      const webhookUrl = mode === 'email' ? EMAIL_WEBHOOK_URL : TASK_WEBHOOK_URL;
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const responseData = await response.json();
      console.log('✅ AIROPS: Webhook response received:', responseData);
      
      setStatus(mode === 'email' ? 'Email sent!' : 'Task created!');
      
      // Clear form
      setComment('');
      setOutputFormat('');
      setSelectedFormat('');
      setUploadedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
    } catch (error) {
      console.error('❌ AIROPS: Request processing failed:', error);
      setStatus('Error: ' + (error.message || 'Unknown error'));
    } finally {
      setIsSending(false);
      isProcessingRef.current = false;
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

  const viewTaskInNewWindow = (task) => {
    const newWindow = window.open('', '_blank');
    newWindow.document.write(`
      <html>
        <head>
          <title>AirOps Task Result</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              max-width: 1000px; 
              margin: 20px auto; 
              padding: 20px; 
              line-height: 1.6; 
              color: #0f172a;
              background: #f8fafc;
            }
            .container {
              background: white;
              border-radius: 12px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              overflow: hidden;
            }
            .header { 
              background: linear-gradient(135deg, #6366f1, #8b5cf6);
              color: white;
              padding: 24px;
              text-align: center;
            }
            h1 { margin: 0; font-size: 24px; font-weight: 600; }
            .content { padding: 24px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>AirOps Task Result</h1>
            </div>
            <div class="content">
              ${task.result || '<p>No result available yet.</p>'}
            </div>
          </div>
        </body>
      </html>
    `);
    newWindow.document.close();
  };

  const viewHistoryEntryInNewWindow = (entry) => {
    const newWindow = window.open('', '_blank');
    const content = entry.result || entry.text;
    
    newWindow.document.write(`
      <html>
        <head>
          <title>AirOps History Entry</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              max-width: 1000px; 
              margin: 20px auto; 
              padding: 20px; 
              line-height: 1.6; 
              color: #0f172a;
              background: #f8fafc;
            }
            .container {
              background: white;
              border-radius: 12px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              overflow: hidden;
            }
            .header { 
              background: linear-gradient(135deg, #6366f1, #8b5cf6);
              color: white;
              padding: 24px;
              text-align: center;
            }
            h1 { margin: 0; font-size: 24px; font-weight: 600; }
            .content { padding: 24px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>AirOps History Entry</h1>
            </div>
            <div class="content">
              ${content}
            </div>
          </div>
        </body>
      </html>
    `);
    newWindow.document.close();
  };

  if (!context) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '150px',
        fontSize: theme.fontSize.base,
        color: theme.colors.tertiary
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: theme.spacing.sm }}>Loading AirOps Plugin...</div>
          <div style={{ 
            width: '20px', 
            height: '20px', 
            border: `2px solid ${theme.colors.border}`,
            borderTop: `2px solid ${theme.colors.accent}`,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }} />
        </div>
      </div>
    );
  }

  if (context.type === 'messageComposer' && !context.conversation) {
    return (
      <div style={{
        padding: theme.spacing.lg,
        fontSize: theme.fontSize.base,
        color: theme.colors.secondary,
        textAlign: 'center',
        background: theme.colors.background,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.borderRadius.lg,
        margin: theme.spacing.md
      }}>
        <div style={{ marginBottom: theme.spacing.sm }}>
          <EmailIcon size={24} color={theme.colors.tertiary} />
        </div>
        <div style={{ fontWeight: '500', marginBottom: theme.spacing.xs }}>
          Select a conversation
        </div>
        <div style={{ fontSize: theme.fontSize.sm, color: theme.colors.tertiary }}>
          Choose a conversation to use the AirOps plugin
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={cardRef}
      className="airops-plugin-card"
      style={{
        width: `${cardSize.width}px`,
        height: `${cardSize.height}px`,
        background: theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        fontSize: theme.fontSize.base,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: theme.shadows.md,
        display: 'flex',
        flexDirection: 'column',
        minWidth: '200px',
        minHeight: '280px',
        maxWidth: '100%',
        maxHeight: '100%',
        transition: isResizing ? 'none' : 'width 0.2s ease, height 0.2s ease'
      }}
    >
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
        paddingBottom: theme.spacing.xs,
        borderBottom: `1px solid ${theme.colors.border}`
      }}>
        <img 
          src={AIROPS_LOGO_URL} 
          alt="" 
          style={{ 
            width: '12px', 
            height: '12px', 
            marginRight: theme.spacing.sm
          }}
        />
        <span style={{
          fontSize: theme.fontSize.lg,
          fontWeight: '600',
          color: theme.colors.primary,
          flex: 1
        }}>
          {cardSize.width < 220 ? 'AirOps' : 'Send to AirOps'}
        </span>
        
        {/* Debug buttons */}
        <div style={{ display: 'flex', gap: theme.spacing.xs }}>
          <button
            onClick={debugHistoryAPI}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: theme.spacing.xs,
              borderRadius: theme.borderRadius.sm,
              color: theme.colors.tertiary,
              fontSize: theme.fontSize.lg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => e.target.style.color = theme.colors.accent}
            onMouseLeave={(e) => e.target.style.color = theme.colors.tertiary}
            title="Debug API (check console)"
          >
            🧪
          </button>
          <button
            onClick={manualRefresh}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: theme.spacing.xs,
              borderRadius: theme.borderRadius.sm,
              color: theme.colors.tertiary,
              fontSize: theme.fontSize.lg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => e.target.style.color = theme.colors.primary}
            onMouseLeave={(e) => e.target.style.color = theme.colors.tertiary}
            title="Manual refresh"
          >
            ↻
          </button>
        </div>
      </div>

      {/* Mode Tabs */}
      <div style={{ marginBottom: theme.spacing.sm }}>
        <div style={{
          display: 'flex',
          background: theme.colors.background,
          borderRadius: theme.borderRadius.md,
          padding: '1px',
          border: `1px solid ${theme.colors.border}`
        }}>
          <button
            onClick={() => setMode('email')}
            style={{
              flex: 1,
              padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
              border: 'none',
              borderRadius: theme.borderRadius.sm,
              fontSize: theme.fontSize.sm,
              fontWeight: '500',
              cursor: 'pointer',
              background: mode === 'email' ? theme.colors.surface : 'transparent',
              color: mode === 'email' ? theme.colors.primary : theme.colors.secondary,
              boxShadow: mode === 'email' ? theme.shadows.sm : 'none',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <EmailIcon 
              size={theme.iconSize.sm} 
              color={mode === 'email' ? theme.colors.primary : theme.colors.secondary} 
              style={{ marginRight: theme.spacing.xs }} 
            />
            Email
          </button>
          <button
            onClick={() => setMode('task')}
            style={{
              flex: 1,
              padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
              border: 'none',
              borderRadius: theme.borderRadius.sm,
              fontSize: theme.fontSize.sm,
              fontWeight: '500',
              cursor: 'pointer',
              background: mode === 'task' ? theme.colors.surface : 'transparent',
              color: mode === 'task' ? theme.colors.primary : theme.colors.secondary,
              boxShadow: mode === 'task' ? theme.shadows.sm : 'none',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <TaskIcon 
              size={theme.iconSize.sm} 
              color={mode === 'task' ? theme.colors.primary : theme.colors.secondary} 
              style={{ marginRight: theme.spacing.xs }} 
            />
            Task
          </button>
        </div>
      </div>
      
      {/* Content Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        paddingRight: '2px',
        marginBottom: theme.spacing.sm
      }}>
        {/* Instructions Input */}
        <div ref={textareaContainerRef} style={{ position: 'relative', marginBottom: theme.spacing.sm }}>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={
              mode === 'email' ? "How should we respond?" : "What do you need created?"
            }
            style={{
              width: '100%',
              height: `${textareaHeight}px`,
              padding: theme.spacing.sm,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.borderRadius.md,
              fontSize: theme.fontSize.base,
              fontFamily: 'inherit',
              resize: 'none',
              paddingBottom: theme.spacing.lg,
              background: theme.colors.surface,
              color: theme.colors.primary,
              transition: 'border-color 0.2s ease'
            }}
            onFocus={(e) => e.target.style.borderColor = theme.colors.accent}
            onBlur={(e) => e.target.style.borderColor = theme.colors.border}
          />
          
          {/* Textarea resize handle */}
          <div
            onMouseDown={handleTextareaResizeStart}
            style={{
              position: 'absolute',
              bottom: '2px',
              right: theme.spacing.sm,
              left: theme.spacing.sm,
              height: '16px',
              cursor: 'ns-resize',
              background: `linear-gradient(90deg, transparent 30%, ${theme.colors.border} 30%, ${theme.colors.border} 35%, transparent 35%, transparent 65%, ${theme.colors.border} 65%, ${theme.colors.border} 70%, transparent 70%)`,
              backgroundSize: '8px 2px',
              opacity: 0.5,
              borderRadius: `0 0 ${theme.borderRadius.sm} ${theme.borderRadius.sm}`,
              transition: 'opacity 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 50
            }}
            onMouseEnter={(e) => e.target.style.opacity = '0.8'}
            onMouseLeave={(e) => e.target.style.opacity = '0.5'}
            title="Drag to resize textarea"
          >
            <div style={{
              width: '28px',
              height: '4px',
              background: theme.colors.tertiary,
              borderRadius: '2px',
              opacity: 0.8
            }} />
          </div>
        </div>

        {/* Task Mode Controls */}
        {mode === 'task' && (
          <div style={{ marginBottom: theme.spacing.sm }}>
            <label style={{
              display: 'block',
              marginBottom: theme.spacing.xs,
              fontSize: theme.fontSize.sm,
              fontWeight: '600',
              color: theme.colors.primary
            }}>
              Output Format <span style={{ color: theme.colors.tertiary, fontWeight: '400' }}>(Optional)</span>
            </label>
            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
              style={{
                width: '100%',
                padding: theme.spacing.sm,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.md,
                fontSize: theme.fontSize.base,
                fontFamily: 'inherit',
                background: theme.colors.surface,
                cursor: 'pointer',
                color: theme.colors.primary,
                transition: 'border-color 0.2s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = theme.colors.accent}
              onBlur={(e) => e.target.style.borderColor = theme.colors.border}
            >
              {formatOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {/* File Upload */}
            <div style={{ marginTop: theme.spacing.sm }}>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                accept=".txt,.csv,.json,.doc,.docx,.pdf,.png,.jpg,.jpeg,.js,.jsx,.ts,.tsx,.py,.html,.css,.md,.xml,.yaml,.yml,.sql,.sh,.bat,.dockerfile,.gitignore,.env"
                style={{ display: 'none' }}
                multiple={false}
              />
              
              {!uploadedFile ? (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{ 
                    width: '100%',
                    background: 'none',
                    border: `1px dashed ${theme.colors.border}`,
                    color: theme.colors.accent,
                    fontSize: theme.fontSize.xs,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    padding: `${theme.spacing.sm}`,
                    borderRadius: theme.borderRadius.sm,
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = `${theme.colors.accent}08`;
                    e.target.style.borderColor = theme.colors.accent;
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.borderColor = theme.colors.border;
                  }}
                >
                  <UploadIcon size={theme.iconSize.md} color={theme.colors.accent} style={{ marginRight: theme.spacing.xs }} />
                  Upload reference file (optional)
                </button>
              ) : (
                <div style={{
                  background: theme.colors.background,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.borderRadius.sm,
                  padding: theme.spacing.sm,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ 
                    fontSize: theme.fontSize.xs, 
                    color: theme.colors.primary,
                    display: 'flex',
                    alignItems: 'center',
                    flex: 1,
                    minWidth: 0
                  }}>
                    <AttachmentIcon size={theme.iconSize.sm} color={theme.colors.secondary} style={{ marginRight: theme.spacing.xs, flexShrink: 0 }} />
                    <div style={{ 
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(0)}KB)
                      {uploadedFile.isProcessed && <span style={{ color: theme.colors.success }}> ✓</span>}
                    </div>
                  </div>
                  <button
                    onClick={removeFile}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: theme.spacing.xs,
                      borderRadius: theme.borderRadius.sm,
                      color: theme.colors.tertiary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginLeft: theme.spacing.xs,
                      flexShrink: 0
                    }}
                    onMouseEnter={(e) => e.target.style.color = theme.colors.secondary}
                    onMouseLeave={(e) => e.target.style.color = theme.colors.tertiary}
                    title="Remove file"
                  >
                    <CrossIcon size={theme.iconSize.sm} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ✅ FIXED: Results and History - Properly separated without syntax errors */}
        {(taskResults.length > 0 || commentHistory.length > 0) && (
          <Accordion expandMode="multi">
            {taskResults.length > 0 && (
              <AccordionSection
                id="tasks"
                title={
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ fontSize: theme.fontSize.sm, fontWeight: '600', color: theme.colors.primary }}>
                      Results ({taskResults.length})
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        clearAllTasks();
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: theme.spacing.xs,
                        borderRadius: theme.borderRadius.sm,
                        color: theme.colors.tertiary,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      onMouseEnter={(e) => e.target.style.color = theme.colors.secondary}
                      onMouseLeave={(e) => e.target.style.color = theme.colors.tertiary}
                      title="Delete all tasks"
                    >
                      <Icon name="TrashFilled" size={theme.iconSize.md} />
                    </button>
                  </div>
                }
              >
                <div style={{ marginLeft: '-2px', marginRight: '-2px' }}>
                  {taskResults.slice(0, 5).map((task) => (
                    <div
                      key={task.id}
                      style={{
                        background: theme.colors.background,
                        border: `1px solid ${theme.colors.border}`,
                        borderRadius: theme.borderRadius.md,
                        padding: theme.spacing.sm,
                        marginBottom: theme.spacing.xs,
                        fontSize: theme.fontSize.xs
                      }}
                    >
                      {/* Task Header */}
                      <div 
                        onClick={() => toggleTaskExpansion(task.id)}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          marginBottom: theme.spacing.xs,
                          cursor: 'pointer',
                          padding: theme.spacing.xs,
                          borderRadius: theme.borderRadius.sm,
                          transition: 'background-color 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = theme.colors.background}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                        title="Click to expand/collapse"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                          <div style={{ 
                            marginRight: theme.spacing.sm,
                            transform: expandedTasks.has(task.id) ? 'rotate(90deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s ease',
                            fontSize: theme.fontSize.xs,
                            color: theme.colors.tertiary
                          }}>
                            ▶
                          </div>
                          
                          {task.status === 'pending' ? (
                            <div style={{ 
                              width: `${theme.iconSize.md}px`, 
                              height: `${theme.iconSize.md}px`, 
                              marginRight: theme.spacing.sm,
                              border: `2px solid ${theme.colors.accent}`,
                              borderTop: '2px solid transparent',
                              borderRadius: '50%',
                              animation: 'spin 1s linear infinite'
                            }} />
                          ) : task.status === 'completed' ? (
                            <CheckmarkIcon size={theme.iconSize.md} color={theme.colors.success} style={{ marginRight: theme.spacing.sm }} />
                          ) : (
                            <WarningIcon size={theme.iconSize.md} color={theme.colors.warning} style={{ marginRight: theme.spacing.sm }} />
                          )}
                          
                          <div style={{ flex: 1 }}>
                            <div style={{ 
                              color: theme.colors.primary,
                              fontWeight: '600',
                              fontSize: theme.fontSize.sm
                            }}>
                              {/* ✅ NEW: Priority order for task names */}
                              {task.taskName || // From webhook metadata
                               task.displayName || // Alternative name field
                               (task.selectedFormat ? 
                                 formatOptions.find(f => f.value === task.selectedFormat)?.label 
                                 : null) ||
                               task.outputFormat || 
                               'General Task'
                              }
                              {task.hasFile && (
                                <AttachmentIcon 
                                  size={theme.iconSize.sm} 
                                  color={theme.colors.tertiary} 
                                  style={{ marginLeft: theme.spacing.sm }} 
                                />
                              )}
                            </div>
                            <div style={{ 
                              color: theme.colors.tertiary, 
                              fontSize: theme.fontSize.xs,
                              marginTop: '2px'
                            }}>
                              {formatDate(task.createdAt)} • {task.user}
                            </div>
                          </div>
                        </div>
                        
                        <div 
                          style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {task.result && (
                            <button
                              onClick={() => viewTaskInNewWindow(task)}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: theme.spacing.xs,
                                borderRadius: theme.borderRadius.sm,
                                color: theme.colors.tertiary,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              onMouseEnter={(e) => e.target.style.color = theme.colors.info}
                              onMouseLeave={(e) => e.target.style.color = theme.colors.tertiary}
                              title="View task result"
                            >
                              <ViewIcon size={theme.iconSize.md} color="currentColor" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteTask(task.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: theme.spacing.xs,
                              borderRadius: theme.borderRadius.sm,
                              color: theme.colors.tertiary,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            onMouseEnter={(e) => e.target.style.color = theme.colors.secondary}
                            onMouseLeave={(e) => e.target.style.color = theme.colors.tertiary}
                            title="Delete this task"
                          >
                            <Icon name="Trash" size={theme.iconSize.md} />
                          </button>
                        </div>
                      </div>

                      {/* Expandable Content */}
                      {expandedTasks.has(task.id) && (
                        <div style={{ 
                          paddingLeft: theme.spacing.lg,
                          animation: 'fadeIn 0.2s ease-out'
                        }}>
                          {/* Task Status */}
                          <div style={{
                            padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                            background: task.status === 'completed' ? 
                              `${theme.colors.success}15` : 
                              task.status === 'failed' ? 
                              `${theme.colors.warning}15` : 
                              `${theme.colors.accent}15`,
                            border: `1px solid ${
                              task.status === 'completed' ? 
                              theme.colors.success : 
                              task.status === 'failed' ? 
                              theme.colors.warning : 
                              theme.colors.accent
                            }`,
                            borderRadius: theme.borderRadius.sm,
                            fontSize: theme.fontSize.sm,
                            color: task.status === 'completed' ? 
                              theme.colors.success : 
                              task.status === 'failed' ? 
                              theme.colors.warning : 
                              theme.colors.accent,
                            marginBottom: task.result ? theme.spacing.sm : '0',
                            fontWeight: '500'
                          }}>
                            {task.status === 'pending' && 'Processing...'}
                            {task.status === 'completed' && 'Completed'}
                            {task.status === 'failed' && 'Failed'}
                          </div>

                          {/* Task Result Content */}
                          {task.result && (
                            <div>
                              <div style={{
                                background: theme.colors.surface,
                                border: `1px solid ${theme.colors.border}`,
                                borderRadius: theme.borderRadius.md,
                                padding: theme.spacing.lg,
                                marginBottom: theme.spacing.sm,
                                maxHeight: '200px',
                                overflowY: 'auto',
                                fontSize: theme.fontSize.result,
                                lineHeight: '1.5'
                              }}>
                                <div 
                                  dangerouslySetInnerHTML={{ __html: task.result }}
                                  style={{ color: theme.colors.primary }}
                                />
                              </div>
                              
                              <div style={{ 
                                display: 'flex', 
                                gap: theme.spacing.sm,
                                flexWrap: 'wrap'
                              }}>
                                <button
                                  onClick={() => copyToClipboard(task.result)}
                                  style={{
                                    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                                    fontSize: theme.fontSize.sm,
                                    minHeight: 'auto',
                                    display: 'flex',
                                    alignItems: 'center',
                                    background: theme.colors.background,
                                    border: `1px solid ${theme.colors.border}`,
                                    borderRadius: theme.borderRadius.sm,
                                    cursor: 'pointer',
                                    color: theme.colors.secondary,
                                    transition: 'all 0.2s ease'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.target.style.borderColor = theme.colors.borderHover;
                                    e.target.style.backgroundColor = theme.colors.surface;
                                  }}
                                  onMouseLeave={(e) => {
                                    e.target.style.borderColor = theme.colors.border;
                                    e.target.style.backgroundColor = theme.colors.background;
                                  }}
                                >
                                  <CopyIcon size={theme.iconSize.sm} style={{ marginRight: theme.spacing.xs }} />
                                  Copy
                                </button>
                                <button
                                  onClick={() => insertIntoDraft(task.result)}
                                  style={{
                                    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                                    fontSize: theme.fontSize.sm,
                                    minHeight: 'auto',
                                    display: 'flex',
                                    alignItems: 'center',
                                    background: theme.colors.background,
                                    border: `1px solid ${theme.colors.border}`,
                                    borderRadius: theme.borderRadius.sm,
                                    cursor: 'pointer',
                                    color: theme.colors.secondary,
                                    transition: 'all 0.2s ease'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.target.style.borderColor = theme.colors.borderHover;
                                    e.target.style.backgroundColor = theme.colors.surface;
                                  }}
                                  onMouseLeave={(e) => {
                                    e.target.style.borderColor = theme.colors.border;
                                    e.target.style.backgroundColor = theme.colors.background;
                                  }}
                                >
                                  <InsertIcon size={theme.iconSize.sm} color={theme.colors.secondary} style={{ marginRight: theme.spacing.xs }} />
                                  Insert
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </AccordionSection>
            )}

            {commentHistory.length > 0 && (
              <AccordionSection
                id="history"
                title={
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ fontSize: theme.fontSize.sm, fontWeight: '600', color: theme.colors.primary }}>
                      History ({commentHistory.length})
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        clearHistory();
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: theme.spacing.xs,
                        borderRadius: theme.borderRadius.sm,
                        color: theme.colors.tertiary,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      onMouseEnter={(e) => e.target.style.color = theme.colors.error}
                      onMouseLeave={(e) => e.target.style.color = theme.colors.tertiary}
                      title="Delete all history"
                    >
                      <Icon name="TrashFilled" size={theme.iconSize.md} />
                    </button>
                  </div>
                }
              >
                <div style={{ marginLeft: '-2px', marginRight: '-2px' }}>
                  {commentHistory.slice(0, 8).map((entry, index) => {
                    const getBorderColor = () => {
                      if (entry.isTaskCompletion) return theme.colors.success;
                      if (entry.mode === 'email') return theme.colors.info;
                      return theme.colors.border;
                    };

                    const getStatusIcon = () => {
                      if (entry.isTaskCompletion) {
                        return <CheckmarkIcon size={theme.iconSize.md} color={theme.colors.success} style={{ marginRight: theme.spacing.sm }} />;
                      }
                      if (entry.mode === 'email') {
                        return <EmailIcon size={theme.iconSize.md} color={theme.colors.info} style={{ marginRight: theme.spacing.sm }} />;
                      }
                      return <TaskIcon size={theme.iconSize.md} color={theme.colors.secondary} style={{ marginRight: theme.spacing.sm }} />;
                    };

                    const getStatusText = () => {
                      if (entry.isTaskCompletion) return 'Task Completed';
                      if (entry.mode === 'email') return 'Email Request';
                      return 'Task Request';
                    };

                    return (
                      <div
                        key={index}
                        style={{
                          background: theme.colors.background,
                          border: `1px solid ${getBorderColor()}`,
                          borderRadius: theme.borderRadius.md,
                          padding: theme.spacing.sm,
                          marginBottom: theme.spacing.xs,
                          fontSize: theme.fontSize.xs
                        }}
                      >
                        <div 
                          onClick={() => toggleHistoryExpansion(index)}
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            marginBottom: theme.spacing.xs,
                            cursor: 'pointer',
                            padding: theme.spacing.xs,
                            borderRadius: theme.borderRadius.sm,
                            transition: 'background-color 0.2s ease'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = theme.colors.surface}
                          onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                          title="Click to expand/collapse"
                        >
                          <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                            <div style={{ 
                              marginRight: theme.spacing.sm,
                              transform: expandedHistory.has(index) ? 'rotate(90deg)' : 'rotate(0deg)',
                              transition: 'transform 0.2s ease',
                              fontSize: theme.fontSize.xs,
                              color: theme.colors.tertiary
                            }}>
                              ▶
                            </div>
                            
                            {getStatusIcon()}
                            
                            <div style={{ flex: 1 }}>
                              <div style={{ 
                                color: theme.colors.primary,
                                fontWeight: '600',
                                fontSize: theme.fontSize.sm
                              }}>
                                {getStatusText()}
                                {entry.hasFile && (
                                  <AttachmentIcon 
                                    size={theme.iconSize.sm} 
                                    color={theme.colors.tertiary} 
                                    style={{ marginLeft: theme.spacing.sm }} 
                                  />
                                )}
                              </div>
                              <div style={{ 
                                color: theme.colors.tertiary, 
                                fontSize: theme.fontSize.xs,
                                marginTop: '2px'
                              }}>
                                {formatDate(entry.timestamp)} • {entry.user}
                              </div>
                            </div>
                          </div>
                          
                          <div 
                            style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => viewHistoryEntryInNewWindow(entry)}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: theme.spacing.xs,
                                borderRadius: theme.borderRadius.sm,
                                color: theme.colors.tertiary,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              onMouseEnter={(e) => e.target.style.color = theme.colors.info}
                              onMouseLeave={(e) => e.target.style.color = theme.colors.tertiary}
                              title="View entry"
                            >
                              <ViewIcon size={theme.iconSize.md} color="currentColor" />
                            </button>
                            
                            <button
                              onClick={() => copyToClipboard(entry.result || entry.text)}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: theme.spacing.xs,
                                borderRadius: theme.borderRadius.sm,
                                color: theme.colors.tertiary,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              onMouseEnter={(e) => e.target.style.color = theme.colors.secondary}
                              onMouseLeave={(e) => e.target.style.color = theme.colors.tertiary}
                              title="Copy content"
                            >
                              <CopyIcon size={theme.iconSize.md} />
                            </button>
                            
                            <button
                              onClick={() => insertIntoDraft(entry.result || entry.text)}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: theme.spacing.xs,
                                borderRadius: theme.borderRadius.sm,
                                color: theme.colors.tertiary,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              onMouseEnter={(e) => e.target.style.color = theme.colors.secondary}
                              onMouseLeave={(e) => e.target.style.color = theme.colors.tertiary}
                              title="Insert into draft"
                            >
                              <InsertIcon size={theme.iconSize.md} color={theme.colors.tertiary} />
                            </button>
                            
                            <button
                              onClick={() => {
                                if (confirm('Delete this history entry?')) {
                                  deleteHistoryEntry(index);
                                }
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: theme.spacing.xs,
                                borderRadius: theme.borderRadius.sm,
                                color: theme.colors.tertiary,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              onMouseEnter={(e) => e.target.style.color = theme.colors.error}
                              onMouseLeave={(e) => e.target.style.color = theme.colors.tertiary}
                              title="Delete this entry"
                            >
                              <Icon name="Trash" size={theme.iconSize.md} />
                            </button>
                          </div>
                        </div>

                        {expandedHistory.has(index) && (
                          <div style={{ 
                            paddingLeft: theme.spacing.lg,
                            animation: 'fadeIn 0.2s ease-out'
                          }}>
                            <div style={{
                              background: theme.colors.surface,
                              border: `1px solid ${theme.colors.border}`,
                              borderRadius: theme.borderRadius.md,
                              padding: theme.spacing.lg,
                              fontSize: theme.fontSize.base,
                              lineHeight: '1.5',
                              color: theme.colors.secondary
                            }}>
                              {entry.result ? (
                                <div dangerouslySetInnerHTML={{ __html: entry.result }} />
                              ) : (
                                entry.text
                              )}
                            </div>
                            
                            <div style={{ 
                              display: 'flex', 
                              gap: theme.spacing.sm,
                              marginTop: theme.spacing.sm,
                              flexWrap: 'wrap'
                            }}>
                              <button
                                onClick={() => copyToClipboard(entry.result || entry.text)}
                                style={{
                                  padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                                  fontSize: theme.fontSize.sm,
                                  minHeight: 'auto',
                                  display: 'flex',
                                  alignItems: 'center',
                                  background: theme.colors.background,
                                  border: `1px solid ${theme.colors.border}`,
                                  borderRadius: theme.borderRadius.sm,
                                  cursor: 'pointer',
                                  color: theme.colors.secondary,
                                  transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.borderColor = theme.colors.borderHover;
                                  e.target.style.backgroundColor = theme.colors.surface;
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.borderColor = theme.colors.border;
                                  e.target.style.backgroundColor = theme.colors.background;
                                }}
                              >
                                <CopyIcon size={theme.iconSize.sm} style={{ marginRight: theme.spacing.xs }} />
                                Copy
                              </button>
                              <button
                                onClick={() => insertIntoDraft(entry.result || entry.text)}
                                style={{
                                  padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                                  fontSize: theme.fontSize.sm,
                                  minHeight: 'auto',
                                  display: 'flex',
                                  alignItems: 'center',
                                  background: theme.colors.background,
                                  border: `1px solid ${theme.colors.border}`,
                                  borderRadius: theme.borderRadius.sm,
                                  cursor: 'pointer',
                                  color: theme.colors.secondary,
                                  transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.borderColor = theme.colors.borderHover;
                                  e.target.style.backgroundColor = theme.colors.surface;
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.borderColor = theme.colors.border;
                                  e.target.style.backgroundColor = theme.colors.background;
                                }}
                              >
                                <InsertIcon size={theme.iconSize.sm} color={theme.colors.secondary} style={{ marginRight: theme.spacing.xs }} />
                                Insert
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </AccordionSection>
            )}
          </Accordion>
        )}
      </div>

      {/* Bottom Section */}
      <div style={{
        borderTop: `1px solid ${theme.colors.border}`,
        paddingTop: theme.spacing.sm
      }}>
        <button
          onClick={processRequest}
          disabled={isSending}
          style={{
            width: '100%',
            marginBottom: theme.spacing.xs,
            fontSize: theme.fontSize.base,
            fontWeight: '600',
            padding: theme.spacing.sm,
            background: isSending ? theme.colors.tertiary : theme.colors.primary,
            color: 'white',
            border: 'none',
            borderRadius: theme.borderRadius.md,
            cursor: isSending ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: isSending ? 'none' : theme.shadows.sm
          }}
          onMouseEnter={(e) => {
            if (!isSending) {
              e.target.style.backgroundColor = '#374151';
              e.target.style.transform = 'translateY(-1px)';
              e.target.style.boxShadow = theme.shadows.md;
            }
          }}
          onMouseLeave={(e) => {
            if (!isSending) {
              e.target.style.backgroundColor = theme.colors.primary;
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = theme.shadows.sm;
            }
          }}
        >
          {isSending ? 'Processing...' : 'Send'}
        </button>
        
        {status && (
          <div style={{
            padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
            background: theme.colors.background,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.borderRadius.md,
            fontSize: theme.fontSize.xs,
            color: theme.colors.secondary,
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {(status.includes('success') || status.includes('completed') || status.includes('saved') || status.includes('created')) && (
              <SuccessIcon 
                size={theme.iconSize.sm} 
                color={theme.colors.success} 
                style={{ marginRight: theme.spacing.xs }} 
              />
            )}
            <span>{status}</span>
          </div>
        )}
      </div>

      {/* Card resize handle */}
      <div
        onMouseDown={handleCardResizeStart}
        style={{
          position: 'absolute',
          bottom: '0px',
          right: '0px',
          width: '18px',
          height: '18px',
          cursor: 'nw-resize',
          background: `linear-gradient(-45deg, transparent 30%, ${theme.colors.tertiary} 30%, ${theme.colors.tertiary} 35%, transparent 35%, transparent 65%, ${theme.colors.tertiary} 65%, ${theme.colors.tertiary} 70%, transparent 70%)`,
          backgroundSize: '4px 4px',
          opacity: 0.6,
          borderRadius: `0 0 ${theme.borderRadius.lg} 0`,
          transition: 'opacity 0.2s ease, background-color 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}
        onMouseEnter={(e) => {
          e.target.style.opacity = '1.0';
          e.target.style.background = `linear-gradient(-45deg, transparent 30%, ${theme.colors.accent} 30%, ${theme.colors.accent} 35%, transparent 35%, transparent 65%, ${theme.colors.accent} 65%, ${theme.colors.accent} 70%, transparent 70%)`;
        }}
        onMouseLeave={(e) => {
          e.target.style.opacity = '0.6';
          e.target.style.background = `linear-gradient(-45deg, transparent 30%, ${theme.colors.tertiary} 30%, ${theme.colors.tertiary} 35%, transparent 35%, transparent 65%, ${theme.colors.tertiary} 65%, ${theme.colors.tertiary} 70%, transparent 70%)`;
        }}
        title="Drag to resize card"
      >
        <div style={{
          width: '8px',
          height: '8px',
          background: 'transparent',
          border: `2px solid currentColor`,
          borderRadius: '2px',
          opacity: 0.8
        }} />
      </div>
    </div>
  );
}

export default App;