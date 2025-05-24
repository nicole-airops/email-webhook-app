// Test what's actually available from Front UI Kit
import React from 'react';

// Try importing everything we've been using
try {
  const frontKit = require('@frontapp/ui-kit');
  console.log('🎯 AVAILABLE FRONT UI KIT EXPORTS:', Object.keys(frontKit));
  
  // Test specific imports
  const { Button } = frontKit;
  console.log('✅ Button import works:', !!Button);
  
  const { FormFieldContainer } = frontKit;
  console.log('✅ FormFieldContainer import works:', !!FormFieldContainer);
  
  const { ButtonGroup } = frontKit;
  console.log('✅ ButtonGroup import works:', !!ButtonGroup);
  
  // Test design tokens
  const { grey, palette, fontStyles } = frontKit;
  console.log('🎨 Design tokens available:', { grey: !!grey, palette: !!palette, fontStyles: !!fontStyles });
  
} catch (error) {
  console.error('❌ Import error:', error.message);
}

export default function TestImports() {
  return <div>Check console for import test results</div>;
}