/**
 * LocalStorage Test Script for Storage Warning Modal
 * 
 * This script can be run in the browser console to populate localStorage
 * with realistic conversation data for testing the StorageWarningModal component.
 * 
 * Usage:
 * 1. Open your application in the browser
 * 2. Open the browser console (F12)
 * 3. Copy and paste this entire script
 * 4. Use the provided functions to fill storage to desired levels
 */

(function() {
  'use strict';

  // Model IDs from the actual codebase
  const MODELS = [
    { id: 'gpt-35-turbo', name: 'GPT-3.5' },
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    { id: 'gpt-4', name: 'GPT-4' },
    { id: 'o1', name: 'o1' },
    { id: 'gpt-o1-mini', name: 'o1 Mini' },
    { id: 'o3-mini', name: 'o3 Mini' }
  ];

  // Sample message content for realistic conversations
  const SAMPLE_PROMPTS = [
    "Can you help me understand how React hooks work?",
    "What's the difference between let and const in JavaScript?",
    "How do I implement authentication in Next.js?",
    "Explain the concept of closures in JavaScript",
    "What are the best practices for API design?",
    "How can I optimize my React application's performance?",
    "What's the difference between SQL and NoSQL databases?",
    "Can you help me debug this TypeScript error?",
    "How do I set up CI/CD with GitHub Actions?",
    "What are microservices and when should I use them?",
    "Explain async/await in JavaScript",
    "How do I handle state management in large React apps?",
    "What's the best way to structure a Node.js project?",
    "Can you explain Docker containers?",
    "How do I implement server-side rendering in Next.js?",
    "What are Web Workers and how do I use them?",
    "Explain the event loop in Node.js",
    "How do I secure my REST API?",
    "What's the difference between PUT and PATCH?",
    "How do I implement pagination in my API?"
  ];

  const SAMPLE_RESPONSES = [
    "React hooks are functions that let you use state and other React features in functional components. The most common hooks are useState for managing component state and useEffect for handling side effects.",
    "The main difference between let and const is that const creates a constant reference that cannot be reassigned, while let allows reassignment. Both are block-scoped, unlike var which is function-scoped.",
    "To implement authentication in Next.js, you can use NextAuth.js which provides a complete authentication solution with support for various providers like OAuth, email/password, and more.",
    "A closure is a function that has access to variables in its outer (enclosing) lexical scope, even after the outer function has returned. This allows for data privacy and function factories.",
    "Best practices for API design include using RESTful conventions, proper HTTP status codes, versioning, pagination for large datasets, consistent naming conventions, and comprehensive documentation.",
    "To optimize React performance, use React.memo for component memoization, useMemo and useCallback hooks, lazy loading with React.lazy, code splitting, and virtual scrolling for long lists.",
    "SQL databases are relational and use structured schemas with ACID compliance, while NoSQL databases are non-relational, schema-flexible, and designed for horizontal scaling.",
    "TypeScript errors often relate to type mismatches. Check that your types are correctly defined, use proper generics, and ensure all required properties are present in objects.",
    "Setting up CI/CD with GitHub Actions involves creating workflow files in .github/workflows that define triggers, jobs, and steps to build, test, and deploy your application.",
    "Microservices are an architectural style where applications are built as a collection of small, independent services. Use them when you need scalability, technology diversity, and team autonomy."
  ];

  // Utility function to generate a unique ID
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Generate a random date within the last N days
  function generateDate(daysAgo) {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
    date.setHours(Math.floor(Math.random() * 24));
    date.setMinutes(Math.floor(Math.random() * 60));
    return date.toISOString();
  }

  // Generate a realistic conversation name
  function generateConversationName(index) {
    const topics = [
      'React Development',
      'API Design Discussion',
      'Database Architecture',
      'Performance Optimization',
      'Security Best Practices',
      'TypeScript Questions',
      'Docker Setup',
      'Testing Strategy',
      'Code Review',
      'Bug Investigation',
      'Feature Planning',
      'Technical Documentation',
      'Deployment Process',
      'State Management',
      'Authentication Flow'
    ];
    return topics[index % topics.length] + ' - ' + new Date().toLocaleDateString();
  }

  // Generate a message with realistic content
  function generateMessage(role, index, includeComplexContent = false) {
    const message = {
      role: role,
      messageType: 'text'
    };

    if (role === 'user') {
      const promptIndex = index % SAMPLE_PROMPTS.length;
      const prompt = SAMPLE_PROMPTS[promptIndex];
      
      // Sometimes make the message longer by repeating content
      const repeatCount = Math.random() > 0.7 ? Math.floor(Math.random() * 3) + 1 : 1;
      const fullPrompt = Array(repeatCount).fill(prompt).join(' Additionally, ');

      if (includeComplexContent && Math.random() > 0.8) {
        // 20% chance of complex content (image or file)
        if (Math.random() > 0.5) {
          // Image content
          message.content = [
            { type: 'text', text: fullPrompt },
            { 
              type: 'image_url', 
              image_url: { 
                url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
                detail: 'auto'
              }
            }
          ];
          message.messageType = 'image';
        } else {
          // File content
          message.content = [
            { type: 'text', text: fullPrompt },
            { 
              type: 'file_url', 
              url: 'https://example.com/file.pdf',
              originalFilename: 'document_' + index + '.pdf'
            }
          ];
          message.messageType = 'file';
        }
      } else {
        message.content = fullPrompt;
      }
    } else {
      const responseIndex = index % SAMPLE_RESPONSES.length;
      let response = SAMPLE_RESPONSES[responseIndex];
      
      // Make some responses much longer to increase storage usage
      const repeatCount = Math.random() > 0.6 ? Math.floor(Math.random() * 10) + 1 : 1;
      response = Array(repeatCount).fill(response).join('\n\n');
      
      // Sometimes add code blocks to make responses longer
      if (Math.random() > 0.5) {
        response += '\n\n```javascript\n' + 
          'function example() {\n' +
          '  // This is sample code to increase message size\n' +
          '  const data = ' + JSON.stringify(Array(50).fill({ key: 'value', nested: { deep: true } })) + ';\n' +
          '  return data;\n' +
          '}\n```';
      }
      
      message.content = response;
      
      // Occasionally add citations
      if (Math.random() > 0.85) {
        message.citations = [
          {
            document_id: 'doc_' + index,
            title: 'Technical Documentation',
            url: 'https://docs.example.com/page' + index,
            snippet: 'This is a relevant excerpt from the documentation...',
            chunks: ['chunk1', 'chunk2']
          }
        ];
      }
    }

    return message;
  }

  // Generate a conversation with realistic data
  function generateConversation(index, messageCount = 10, daysAgo = 30) {
    const conversationId = generateId() + '_' + index;
    const messages = [];
    
    // Generate alternating user/assistant messages
    for (let i = 0; i < messageCount; i++) {
      const role = i % 2 === 0 ? 'user' : 'assistant';
      const includeComplex = i === 0 && Math.random() > 0.7; // 30% chance of complex content in first message
      messages.push(generateMessage(role, i, includeComplex));
    }

    const createdAt = generateDate(daysAgo);
    const updatedAt = generateDate(Math.floor(daysAgo / 2)); // Updated more recently

    const modelIndex = Math.floor(Math.random() * MODELS.length);
    const model = MODELS[modelIndex];

    return {
      id: conversationId,
      name: generateConversationName(index),
      messages: messages,
      model: {
        id: model.id,
        name: model.name,
        maxLength: 24000,
        tokenLimit: 8000,
        modelType: 'foundational'
      },
      prompt: 'You are a helpful AI assistant.',
      temperature: 0.7 + (Math.random() * 0.3), // Random between 0.7 and 1.0
      folderId: Math.random() > 0.7 ? 'folder_' + Math.floor(Math.random() * 5) : null,
      createdAt: createdAt,
      updatedAt: updatedAt
    };
  }

  // Calculate current storage usage
  function getStorageInfo() {
    let totalSize = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const item = localStorage.getItem(key);
        if (item) {
          totalSize += item.length + key.length;
        }
      }
    }
    
    const maxSize = 5 * 1024 * 1024; // 5MB default
    const percentUsed = (totalSize / maxSize) * 100;
    
    return {
      currentSize: totalSize,
      maxSize: maxSize,
      percentUsed: percentUsed,
      formattedSize: formatBytes(totalSize),
      formattedMax: formatBytes(maxSize)
    };
  }

  // Format bytes to human-readable format
  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    const kb = bytes / 1024;
    if (kb < 1024) return kb.toFixed(2) + ' KB';
    const mb = kb / 1024;
    return mb.toFixed(2) + ' MB';
  }

  // Fill storage to a specific percentage
  function fillStorageToPercentage(targetPercent) {
    console.log(`Starting to fill storage to ${targetPercent}%...`);
    
    // Clear existing conversations first
    clearTestData();
    
    const targetSize = (targetPercent / 100) * 5 * 1024 * 1024; // Target size in bytes
    let currentSize = 0;
    const conversations = [];
    let conversationIndex = 0;
    
    // Generate conversations until we reach the target size
    while (currentSize < targetSize) {
      const messageCount = Math.floor(Math.random() * 20) + 5; // 5-25 messages
      const daysAgo = Math.floor(Math.random() * 90) + 1; // 1-90 days ago
      const conversation = generateConversation(conversationIndex, messageCount, daysAgo);
      
      const conversationSize = JSON.stringify(conversation).length;
      if (currentSize + conversationSize > targetSize && conversations.length > 5) {
        // Stop if adding this conversation would exceed target (unless we have very few conversations)
        break;
      }
      
      conversations.push(conversation);
      currentSize += conversationSize;
      conversationIndex++;
      
      // Safety check to prevent infinite loop
      if (conversationIndex > 1000) {
        console.warn('Safety limit reached: stopping at 1000 conversations');
        break;
      }
    }
    
    // Save conversations to localStorage
    try {
      localStorage.setItem('conversations', JSON.stringify(conversations));
      
      // Add some additional data to simulate real usage
      localStorage.setItem('settings', JSON.stringify({
        theme: 'dark',
        language: 'en',
        defaultModel: MODELS[0].id,
        temperature: 0.7
      }));
      
      // Set a selected conversation
      if (conversations.length > 0) {
        localStorage.setItem('selectedConversation', JSON.stringify(conversations[0]));
      }
      
      // Add some folders
      const folders = [
        { id: 'folder_0', name: 'Work Projects', type: 'chat' },
        { id: 'folder_1', name: 'Personal', type: 'chat' },
        { id: 'folder_2', name: 'Learning', type: 'chat' },
        { id: 'folder_3', name: 'Archive', type: 'chat' },
        { id: 'folder_4', name: 'Drafts', type: 'chat' }
      ];
      localStorage.setItem('folders', JSON.stringify(folders));
      
      // Add some prompts
      const prompts = [
        { id: 'prompt_1', name: 'Code Review', content: 'Please review this code for best practices and potential improvements.' },
        { id: 'prompt_2', name: 'Explain Simply', content: 'Explain this concept in simple terms that anyone can understand.' },
        { id: 'prompt_3', name: 'Debug Helper', content: 'Help me debug this issue. Here is the error message and relevant code.' }
      ];
      localStorage.setItem('prompts', JSON.stringify(prompts));
      
      const info = getStorageInfo();
      console.log(`✅ Storage filled successfully!`);
      console.log(`   - Created ${conversations.length} conversations`);
      console.log(`   - Current usage: ${info.formattedSize} / ${info.formattedMax} (${info.percentUsed.toFixed(1)}%)`);
      console.log(`   - Target was: ${targetPercent}%`);
      
      return true;
    } catch (error) {
      console.error('Failed to fill storage:', error);
      return false;
    }
  }

  // Clear test data from localStorage
  function clearTestData() {
    console.log('Clearing existing test data...');
    const keysToRemove = ['conversations', 'selectedConversation', 'folders', 'prompts', 'settings'];
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    console.log('Test data cleared.');
  }

  // Main test functions exposed to global scope
  window.storageTest = {
    // Fill to specific threshold levels
    fillToWarning: function() {
      console.log('Filling storage to WARNING level (70%)...');
      return fillStorageToPercentage(72); // Slightly above 70% to ensure warning triggers
    },
    
    fillToCritical: function() {
      console.log('Filling storage to CRITICAL level (85%)...');
      return fillStorageToPercentage(87); // Slightly above 85%
    },
    
    fillToEmergency: function() {
      console.log('Filling storage to EMERGENCY level (95%)...');
      return fillStorageToPercentage(96); // Slightly above 95%
    },
    
    fillToCustom: function(percent) {
      if (percent < 0 || percent > 100) {
        console.error('Percentage must be between 0 and 100');
        return false;
      }
      console.log(`Filling storage to ${percent}%...`);
      return fillStorageToPercentage(percent);
    },
    
    // Utility functions
    clear: clearTestData,
    
    info: function() {
      const info = getStorageInfo();
      console.log('📊 Current Storage Status:');
      console.log(`   - Usage: ${info.formattedSize} / ${info.formattedMax}`);
      console.log(`   - Percentage: ${info.percentUsed.toFixed(2)}%`);
      
      const conversationsData = localStorage.getItem('conversations');
      if (conversationsData) {
        try {
          const conversations = JSON.parse(conversationsData);
          console.log(`   - Conversations: ${conversations.length}`);
          
          // Show distribution of conversation ages
          const now = new Date();
          const ageGroups = { recent: 0, week: 0, month: 0, older: 0 };
          conversations.forEach(conv => {
            if (conv.updatedAt) {
              const age = (now - new Date(conv.updatedAt)) / (1000 * 60 * 60 * 24);
              if (age < 1) ageGroups.recent++;
              else if (age < 7) ageGroups.week++;
              else if (age < 30) ageGroups.month++;
              else ageGroups.older++;
            }
          });
          console.log(`   - Age distribution:`);
          console.log(`     • Last 24h: ${ageGroups.recent}`);
          console.log(`     • Last week: ${ageGroups.week}`);
          console.log(`     • Last month: ${ageGroups.month}`);
          console.log(`     • Older: ${ageGroups.older}`);
        } catch (e) {
          console.error('Could not parse conversations data');
        }
      }
      
      // Check which threshold level we're at
      const percent = info.percentUsed;
      if (percent >= 95) {
        console.log('   - ⚠️ Status: EMERGENCY LEVEL');
      } else if (percent >= 85) {
        console.log('   - ⚠️ Status: CRITICAL LEVEL');
      } else if (percent >= 70) {
        console.log('   - ⚠️ Status: WARNING LEVEL');
      } else {
        console.log('   - ✅ Status: Normal');
      }
      
      return info;
    },
    
    // Add a single large conversation
    addLargeConversation: function() {
      const conversationsData = localStorage.getItem('conversations');
      const conversations = conversationsData ? JSON.parse(conversationsData) : [];
      
      // Generate a conversation with many messages
      const largeConv = generateConversation(conversations.length, 50, 1);
      conversations.unshift(largeConv); // Add to beginning (most recent)
      
      localStorage.setItem('conversations', JSON.stringify(conversations));
      const info = getStorageInfo();
      console.log(`Added large conversation. Storage now at ${info.percentUsed.toFixed(1)}%`);
      return info;
    },
    
    // Simulate realistic growth over time
    simulateGrowth: function(daysToSimulate = 30) {
      console.log(`Simulating ${daysToSimulate} days of conversation growth...`);
      clearTestData();
      
      const conversations = [];
      let totalDays = daysToSimulate;
      
      for (let day = totalDays; day > 0; day--) {
        // Random number of conversations per day (0-3)
        const conversationsToday = Math.floor(Math.random() * 4);
        
        for (let c = 0; c < conversationsToday; c++) {
          const messageCount = Math.floor(Math.random() * 15) + 2; // 2-17 messages
          const conv = generateConversation(conversations.length, messageCount, day);
          conversations.push(conv);
        }
      }
      
      localStorage.setItem('conversations', JSON.stringify(conversations));
      
      const info = getStorageInfo();
      console.log(`✅ Simulation complete!`);
      console.log(`   - Created ${conversations.length} conversations over ${daysToSimulate} days`);
      console.log(`   - Storage: ${info.formattedSize} (${info.percentUsed.toFixed(1)}%)`);
      return info;
    }
  };

  // Print usage instructions
  console.log('%c📦 Storage Test Utility Loaded!', 'color: #4CAF50; font-size: 16px; font-weight: bold');
  console.log('%cAvailable commands:', 'color: #2196F3; font-weight: bold');
  console.log('  %cstorageTest.fillToWarning()%c    - Fill to 70% (WARNING level)', 'color: #FF9800', 'color: inherit');
  console.log('  %cstorageTest.fillToCritical()%c   - Fill to 85% (CRITICAL level)', 'color: #FF9800', 'color: inherit');
  console.log('  %cstorageTest.fillToEmergency()%c  - Fill to 95% (EMERGENCY level)', 'color: #FF9800', 'color: inherit');
  console.log('  %cstorageTest.fillToCustom(50)%c   - Fill to custom percentage', 'color: #FF9800', 'color: inherit');
  console.log('  %cstorageTest.info()%c             - Show current storage status', 'color: #FF9800', 'color: inherit');
  console.log('  %cstorageTest.clear()%c            - Clear all test data', 'color: #FF9800', 'color: inherit');
  console.log('  %cstorageTest.addLargeConversation()%c - Add a single large conversation', 'color: #FF9800', 'color: inherit');
  console.log('  %cstorageTest.simulateGrowth(30)%c - Simulate realistic growth over N days', 'color: #FF9800', 'color: inherit');
  console.log('\n%cTip: After filling storage, reload the page to trigger the storage warning modal!', 'color: #9C27B0; font-style: italic');

})();