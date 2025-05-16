document.addEventListener('DOMContentLoaded', () => {
    const promptInput = document.getElementById('promptInput');
    const sendButton = document.getElementById('sendButton');
    const chatHistory = document.getElementById('chatHistory');
    const attachFileButton = document.getElementById('attachFileButton');
    const fileInput = document.getElementById('fileInput');
    const fileNameDisplay = document.getElementById('fileName');
    const filePreviewContainer = document.getElementById('filePreviewContainer');
    const removeFileButton = document.getElementById('removeFileButton');
    const modelSelect = document.getElementById('modelSelect');
    
    // Settings elements
    const settingsButton = document.getElementById('settingsButton');
    const settingsModal = document.getElementById('settingsModal');
    const closeButton = document.querySelector('.close-button');
    const userNameInput = document.getElementById('userNameInput');
    const saveUserNameButton = document.getElementById('saveUserName');
    const openRouterKeyInput = document.getElementById('openRouterKeyInput');
    const openAIKeyInput = document.getElementById('openAIKeyInput');
    const anthropicKeyInput = document.getElementById('anthropicKeyInput');
    const saveApiKeysButton = document.getElementById('saveApiKeys');
    const accentColorPicker = document.getElementById('accentColorPicker');
    const saveThemeButton = document.getElementById('saveTheme');
    const wallpaperOptions = document.querySelectorAll('.wallpaper-option');
    
    // Local AI settings elements
    const lmStudioUrlInput = document.getElementById('lmStudioUrlInput');
    const lmStudioModelInput = document.getElementById('lmStudioModelInput');
    const ollamaUrlInput = document.getElementById('ollamaUrlInput');
    const ollamaModelInput = document.getElementById('ollamaModelInput');
    const aiSourceSelect = document.getElementById('aiSourceSelect');
    const saveLocalAISettings = document.getElementById('saveLocalAISettings');

    // OpenRouter API URL
    const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
    
    // Initialize document parser and file handling variables
    const documentParser = new DocumentParser();
    console.log("Document parser initialized:", documentParser ? "success" : "failed");
    
    // File variables
    let attachedFile = null;
    let attachedFileBase64 = null;
    let extractedFileContent = null;
    let isExtracting = false;
    
    // Initialize UI state
    updateSendButtonState();
    
    // Get user settings from storage
    loadUserSettings();
    
    // Handle textarea input and resize
    promptInput.addEventListener('input', () => {
        promptInput.style.height = 'auto';
        promptInput.style.height = `${promptInput.scrollHeight}px`;
        updateSendButtonState();
    });

    // Handle file attachment
    attachFileButton.addEventListener('click', () => {
        fileInput.click();
    });

    // Handle file removal
    removeFileButton.addEventListener('click', (e) => {
        e.stopPropagation();
        clearFileInput();
        updateSendButtonState();
    });

    fileInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        
        // Clear previous file if any
        if (attachedFile) {
            clearFileInput();
        }
        
        if (file) {
            console.log('File selected:', file.name, file.type, file.size);
            attachedFile = file;
            fileNameDisplay.textContent = file.name.length > 15 ? `${file.name.substring(0, 12)}...` : file.name;
            fileNameDisplay.title = file.name;

            // Show file preview container
            filePreviewContainer.classList.add('visible');

            // Generate file preview based on type
            try {
                // Set extracting state to block send button
                isExtracting = true;
                updateSendButtonState();
                sendButton.disabled = true;
                
                // Add extraction overlay
                const inputWrapper = document.querySelector('.input-wrapper');
                const overlay = document.createElement('div');
                overlay.className = 'extracting-overlay';
                overlay.innerHTML = `
                    <div class="extraction-spinner"></div>
                    <span>Processing ${file.type.split('/')[1] || 'file'}...</span>
                `;
                inputWrapper.appendChild(overlay);
                
                // Convert to base64 regardless of file type
                    attachedFileBase64 = await readFileAsBase64(file);
                
                // Force specific MIME type for markdown files without proper MIME type
                let processedFile = file;
                if (file.name.endsWith('.md') && file.type !== 'text/markdown') {
                    console.log('Fixing MIME type for markdown file');
                    processedFile = new File([file], file.name, { type: 'text/markdown' });
                }
                
                // Handle different file types
                if (processedFile.type.startsWith('image/')) {
                    // For images, just store the file data
                    console.log('Image file attached:', processedFile.name, processedFile.type, processedFile.size);
                    showToast(`Image attached: ${processedFile.name}`);
                    extractedFileContent = null;
                } 
                // For PDF, text and other document types, try to extract text
                else if (processedFile.type.startsWith('text/') || processedFile.type === 'application/pdf' || 
                         processedFile.type.includes('document') || processedFile.type.includes('markdown')) {
                    
                    console.log('Document file attached:', processedFile.name, processedFile.type, processedFile.size);
                    
                    // Create notification
                    const previewMsg = addMessageToChat('Extracting document content...', 'ai-message thinking');
                    
                    // Use document parser to extract content
                    if (documentParser?.isSupported(processedFile.type)) {
                        const extraction = await documentParser.extractContent(processedFile, attachedFileBase64);
                        
                        // Remove placeholder message
                        if (previewMsg?.parentNode === chatHistory) {
                            chatHistory.removeChild(previewMsg);
                        }
                        
                        if (extraction?.success) {
                            // Store extracted content for sending with message
                            extractedFileContent = {
                                text: extraction.text,
                                type: processedFile.type,
                                name: processedFile.name,
                                size: processedFile.size
                            };
                            
                            // Get a short preview (first 150 chars)
                            const previewText = extraction.text.length > 150 ? 
                                `${extraction.text.substring(0, 150)}...` : extraction.text;
                                
                            // Show file preview
                            const icon = getFileTypeIcon(processedFile.type);
                            const docPreview = document.createElement('div');
                            docPreview.className = 'document-preview';
                            docPreview.innerHTML = `
                                <div class="document-preview-title">
                                    ${icon}
                                    ${processedFile.name}
                                </div>
                                <div class="document-preview-content">${previewText}</div>
                                <div class="document-file-info">
                                    ${formatFileSize(processedFile.size)} · ${processedFile.type}
                                </div>
                            `;
                            chatHistory.appendChild(docPreview);
                            chatHistory.scrollTop = chatHistory.scrollHeight;
                            
                            showToast('Document content extracted successfully', false);
                        } else {
                            extractedFileContent = null;
                            showToast(`Failed to extract content from ${processedFile.name}`, true);
                        }
                    } else {
                        // Remove placeholder message
                        if (previewMsg?.parentNode === chatHistory) {
                            chatHistory.removeChild(previewMsg);
                        }
                        
                        showToast(`Unsupported document type: ${processedFile.type}`, true);
                        extractedFileContent = null;
                    }
                } else {
                    console.log('Other file attached:', processedFile.name, processedFile.type, processedFile.size);
                    showToast(`File attached: ${processedFile.name}`, false);
                    extractedFileContent = null;
                }
                } catch (error) {
                console.error("Error reading file:", error);
                addMessageToChat(`Error reading file: ${error.message}`, 'ai-message error');
                    clearFileInput();
            } finally {
                // Remove extraction overlay
                const overlay = document.querySelector('.extracting-overlay');
                if (overlay) {
                    overlay.parentNode.removeChild(overlay);
                }
                
                isExtracting = false;
                updateSendButtonState();
            }
        } else {
            clearFileInput();
        }
        updateSendButtonState();
    });

    // Function to get an icon based on file type
    function getFileTypeIcon(fileType) {
        let iconClass = 'file-icon-default';
        let iconContent = '📄';
        
        if (fileType.startsWith('image/')) {
            iconClass = 'file-icon-image';
            iconContent = '🖼️';
        } else if (fileType === 'application/pdf') {
            iconClass = 'file-icon-pdf';
            iconContent = '📕';
        } else if (fileType.startsWith('text/')) {
            iconClass = 'file-icon-text';
            iconContent = '📝';
        } else if (fileType.includes('document') || fileType.includes('word')) {
            iconClass = 'file-icon-doc';
            iconContent = '📄';
        }
        
        return `<span class="${iconClass} file-info-icon">${iconContent}</span>`;
    }

    // Event listeners for sending messages
    sendButton.addEventListener('click', () => {
        // Check again if button should be enabled (defensive programming)
        if (!sendButton.disabled) {
            handleSendMessage();
        }
    });
    
    promptInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            // Only handle if send button is not disabled
            if (!sendButton.disabled) {
            handleSendMessage();
            }
        }
    });

    // Listen for messages from the background script
    chrome.runtime.onMessage.addListener((message) => {
        if (message.action === 'analyze-text' && message.text) {
            // Set the selected text in the input field
            promptInput.value = message.text;
            promptInput.style.height = 'auto';
            promptInput.style.height = `${promptInput.scrollHeight}px`;
            updateSendButtonState();
            // Focus the input to let the user modify it if needed
            promptInput.focus();
        } else if (message.action === 'analyze-image' && message.imageUrl) {
            // Handle image analysis from context menu
            handleImageUrlFromContextMenu(message.imageUrl);
        }
    });

    // Handle model selection changes
    modelSelect.addEventListener('change', function() {
        const selectedModel = this.value;
        const isPaid = !selectedModel.includes(':free');
        
        if (isPaid) {
            // Check if we have an API key
            chrome.storage.local.get(['openRouterApiKey'], (result) => {
                if (!result.openRouterApiKey) {
                    addModelInfoMessage(selectedModel, true);
                } else {
                    addModelInfoMessage(selectedModel, false);
                }
            });
        } else {
            addModelInfoMessage(selectedModel, false);
        }
    });

    // Settings Modal functionality
    settingsButton.addEventListener('click', () => {
        settingsModal.style.display = 'block';
        loadSettingsValues();
    });

    closeButton.addEventListener('click', () => {
        settingsModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === settingsModal) {
            settingsModal.style.display = 'none';
        }
    });

    // Save user name
    saveUserNameButton.addEventListener('click', () => {
        const userName = userNameInput.value.trim();
        if (userName) {
            chrome.storage.local.set({ userName: userName }, () => {
                showToast('Name saved successfully!');
                updateWelcomeMessage(userName);
            });
        }
    });

    // Save all API keys
    saveApiKeysButton.addEventListener('click', () => {
        const openRouterKey = openRouterKeyInput.value.trim();
        const openAIKey = openAIKeyInput.value.trim();
        const anthropicKey = anthropicKeyInput.value.trim();
        const googleAIKey = googleAIKeyInput.value.trim();
        
        const keysToSave = {};
        
        if (openRouterKey && openRouterKey !== '••••••••••••••••••••') {
            keysToSave.openRouterApiKey = openRouterKey;
        }
        
        if (openAIKey && openAIKey !== '••••••••••••••••••••') {
            keysToSave.openAIApiKey = openAIKey;
        }
        
        if (anthropicKey && anthropicKey !== '••••••••••••••••••••') {
            keysToSave.anthropicApiKey = anthropicKey;
        }
        
        if (googleAIKey && googleAIKey !== '••••••••••••••••••••') {
            keysToSave.googleAIKey = googleAIKey;
        }
        
        if (Object.keys(keysToSave).length > 0) {
            chrome.storage.local.set(keysToSave, () => {
                // Mask the values after saving
                if (keysToSave.openRouterApiKey) {
                    openRouterKeyInput.value = '••••••••••••••••••••';
                }
                
                if (keysToSave.openAIApiKey) {
                    openAIKeyInput.value = '••••••••••••••••••••';
                }
                
                if (keysToSave.anthropicApiKey) {
                    anthropicKeyInput.value = '••••••••••••••••••••';
                }
                
                if (keysToSave.googleAIKey) {
                    googleAIKeyInput.value = '••••••••••••••••••••';
                }
                
                showToast('API keys saved successfully!');
            });
        } else {
            showToast('No changes to save.', true);
        }
    });

    // Wallpaper selection
    for (const option of wallpaperOptions) {
        option.addEventListener('click', () => {
            // Remove active class from all options
            for (const opt of wallpaperOptions) {
                opt.classList.remove('active');
            }
            // Add active class to clicked option
            option.classList.add('active');
        });
    }

    // Save theme settings
    saveThemeButton.addEventListener('click', () => {
        const activeWallpaper = document.querySelector('.wallpaper-option.active');
        const wallpaperName = activeWallpaper ? activeWallpaper.dataset.wallpaper : 'iPhone 17 Concept Wallpapers.jpeg';
        const accentColor = accentColorPicker.value;
        
        chrome.storage.local.set({ 
            theme: {
                wallpaper: wallpaperName,
                accentColor: accentColor
            }
        }, () => {
            applyTheme(wallpaperName, accentColor);
            showToast('Theme saved successfully!');
        });
    });

    // Save local AI settings
    saveLocalAISettings.addEventListener('click', () => {
        const lmStudioUrl = lmStudioUrlInput.value.trim();
        const lmStudioModel = lmStudioModelInput.value.trim();
        const ollamaUrl = ollamaUrlInput.value.trim();
        const ollamaModel = ollamaModelInput.value.trim();
        const aiSource = aiSourceSelect.value;
        
        chrome.storage.local.set({
            localAI: {
                lmStudioUrl,
                lmStudioModel,
                ollamaUrl,
                ollamaModel,
                aiSource
            }
        }, () => {
            showToast('Local AI settings saved!');
            
            // If using local AI, update UI to reflect which model is active
            if (aiSource !== 'openrouter') {
                const aiType = aiSource === 'lmstudio' ? 'LM Studio' : 'Ollama';
                const modelName = aiSource === 'lmstudio' ? lmStudioModel : ollamaModel;
                
                if (modelName) {
                    showLocalAIActiveToast(aiType, modelName);
                }
            }
        });
    });
    
    // Function to show which local AI is active
    function showLocalAIActiveToast(aiType, modelName) {
        showToast(`${aiType} model "${modelName}" is now active`);
    }

    function clearFileInput() {
        attachedFile = null;
        attachedFileBase64 = null;
        extractedFileContent = null;
        fileInput.value = ''; // Important to allow re-selecting the same file
        fileNameDisplay.textContent = '';
        fileNameDisplay.title = '';
        filePreviewContainer.classList.remove('visible');
    }

    function updateSendButtonState() {
        // Enable if either we have text OR a file (and not currently extracting)
        const hasText = promptInput.value.trim() !== '';
        const hasFile = attachedFile !== null;
        
        // Only disable if:
        // 1. We're extracting content, OR
        // 2. There's no text AND no file
        sendButton.disabled = isExtracting || (!hasText && !hasFile);
    }

    function loadUserSettings() {
        chrome.storage.local.get(['userName', 'theme'], (result) => {
            if (result.theme) {
                applyTheme(result.theme.wallpaper, result.theme.accentColor);
            }
            
            if (result.userName) {
                updateWelcomeMessage(result.userName);
            }
        });
    }

    // Function to update welcome message
    function updateWelcomeMessage(userName) {
        const welcomeMessage = document.querySelector('.welcome-message');
        if (welcomeMessage) {
            const greeting = userName ? `Hey ${userName}!` : 'Welcome to Auto GPT!';
            
            welcomeMessage.innerHTML = `
                <h3>${greeting}</h3>
                <p>I can help you with questions and analyze various file types:</p>
                <ul style="text-align: left; margin-top: 10px; color: rgba(255,255,255,0.8);">
                    <li>Images (PNG, JPEG, WebP)</li>
                    <li>Documents (PDF, TXT, Markdown)</li>
                    <li>Web content (HTML)</li>
                    <li>And more...</li>
                </ul>
                <p style="margin-top: 10px;">Click the paperclip icon to attach a file or just type a message to get started!</p>
            `;
        }
    }

    function loadSettingsValues() {
        chrome.storage.local.get([
            'userName', 
            'openRouterApiKey', 
            'openAIApiKey', 
            'anthropicApiKey', 
            'theme',
            'localAI',
            'googleAIKey'
        ], (result) => {
            // Set user name
            if (result.userName) {
                userNameInput.value = result.userName;
            }
            
            // Set API keys (masked)
            if (result.openRouterApiKey) {
                openRouterKeyInput.value = '••••••••••••••••••••';
            }
            
            if (result.openAIApiKey) {
                openAIKeyInput.value = '••••••••••••••••••••';
            }
            
            if (result.anthropicApiKey) {
                anthropicKeyInput.value = '••••••••••••••••••••';
            }
            
            if (result.googleAIKey) {
                googleAIKeyInput.value = '••••••••••••••••••••';
            }
            
            // Set local AI settings
            if (result.localAI) {
                if (result.localAI.lmStudioUrl) {
                    lmStudioUrlInput.value = result.localAI.lmStudioUrl;
                }
                
                if (result.localAI.lmStudioModel) {
                    lmStudioModelInput.value = result.localAI.lmStudioModel;
                }
                
                if (result.localAI.ollamaUrl) {
                    ollamaUrlInput.value = result.localAI.ollamaUrl;
                }
                
                if (result.localAI.ollamaModel) {
                    ollamaModelInput.value = result.localAI.ollamaModel;
                }
                
                if (result.localAI.aiSource) {
                    aiSourceSelect.value = result.localAI.aiSource;
                }
            }
            
            // Set theme
            if (result.theme) {
                // Select the active wallpaper
                for (const option of wallpaperOptions) {
                    if (option.dataset.wallpaper === result.theme.wallpaper) {
                        option.classList.add('active');
                    } else {
                        option.classList.remove('active');
                    }
                }
                
                // Set color picker
                if (result.theme.accentColor) {
                    accentColorPicker.value = result.theme.accentColor;
                }
            }
        });
    }

    function applyTheme(wallpaper, accentColor) {
        // Apply wallpaper
        document.body.style.backgroundImage = `url('icons/${wallpaper}')`;
        
        // Apply accent color
        document.documentElement.style.setProperty('--primary-color', accentColor);
        
        // Calculate RGB values for the accent color
        const hexToRgb = (hex) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: Number.parseInt(result[1], 16),
                g: Number.parseInt(result[2], 16),
                b: Number.parseInt(result[3], 16)
            } : null;
        };
        
        const rgb = hexToRgb(accentColor);
        if (rgb) {
            document.documentElement.style.setProperty('--primary-color-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
            
            // Calculate a darker shade for hover state
            const darkenColor = (color, amount) => {
                return `#${Math.max(0, Math.floor(color.r * (1 - amount))).toString(16).padStart(2, '0')}${
                    Math.max(0, Math.floor(color.g * (1 - amount))).toString(16).padStart(2, '0')}${
                    Math.max(0, Math.floor(color.b * (1 - amount))).toString(16).padStart(2, '0')}`;
            };
            
            const hoverColor = darkenColor(rgb, 0.3);
            document.documentElement.style.setProperty('--primary-hover', hoverColor);
            
            // Calculate glow color (slightly transparent)
            document.documentElement.style.setProperty('--glow-color', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`);
        }
    }

    function showToast(message, isError = false) {
        // Create toast element
        const toast = document.createElement('div');
        toast.classList.add('toast');
        if (isError) {
            toast.classList.add('toast-error');
        }
        toast.textContent = message;
        
        // Add to body
        document.body.appendChild(toast);
        
        // Trigger animation
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }

    // Display model information
    function addModelInfoMessage(modelId, needsKey) {
        // This function is now empty - we don't show model info messages anymore
        return;
    }

    updateSendButtonState();
    promptInput.focus();
    
    // Show initial model info when loading the extension
    const initialModel = modelSelect.value;
    const isInitialModelPaid = !initialModel.includes(':free');
    
    chrome.storage.local.get(['openRouterApiKey'], (result) => {
        addModelInfoMessage(initialModel, isInitialModelPaid && !result.openRouterApiKey);
    });

    // Save advanced API settings
    const saveAdvancedSettingsButton = document.getElementById('saveAdvancedSettings');
    const enableCachingToggle = document.getElementById('enableCachingToggle');
    const enableMiddleOutToggle = document.getElementById('enableMiddleOutToggle');
    
    if (saveAdvancedSettingsButton) {
        saveAdvancedSettingsButton.addEventListener('click', () => {
            const enableCaching = enableCachingToggle.checked;
            const enableMiddleOut = enableMiddleOutToggle.checked;
            
            chrome.storage.local.set({
                advancedApiSettings: {
                    enableCaching,
                    enableMiddleOut
                }
            }, () => {
                showToast('Advanced API settings saved!');
            });
        });
    }
    
    // Load advanced API settings from storage
    chrome.storage.local.get(['advancedApiSettings'], (result) => {
        if (result.advancedApiSettings) {
            if (enableCachingToggle) {
                enableCachingToggle.checked = result.advancedApiSettings.enableCaching !== false;
            }
            if (enableMiddleOutToggle) {
                enableMiddleOutToggle.checked = result.advancedApiSettings.enableMiddleOut !== false;
            }
        }
    });

    const conversationsButton = document.getElementById('conversationsButton');
    const conversationsModal = document.getElementById('conversationsModal');
    const conversationList = document.getElementById('conversationList');
    const newConversationInput = document.getElementById('newConversationInput');
    const createConversationBtn = document.getElementById('createConversationBtn');
    const closeConversationsButton = document.querySelector('#conversationsModal .close-button');
    
    // Storage-related elements
    const supabaseUrlInput = document.getElementById('supabaseUrlInput');
    const supabaseKeyInput = document.getElementById('supabaseKeyInput');
    const storageTypeSelect = document.getElementById('storageTypeSelect');
    const saveSupabaseSettings = document.getElementById('saveSupabaseSettings');
    
    // Current conversation state
    let currentConversationId = null;
    let supabaseClient = null;
    let storageSettings = { type: 'none' };
    
    // Initialize storage on load
    initializeStorage();
    
    // Conversations Modal functionality
    conversationsButton.addEventListener('click', () => {
        conversationsModal.style.display = 'block';
        loadConversationsList();
    });

    closeConversationsButton.addEventListener('click', () => {
        conversationsModal.style.display = 'none';
    });
    
    // Create a new conversation
    createConversationBtn.addEventListener('click', async () => {
        const title = newConversationInput.value.trim() || 'New Conversation';
        try {
            await createNewConversation(title);
            newConversationInput.value = '';
            loadConversationsList();
            showToast(`Created conversation: ${title}`);
        } catch (error) {
            console.error("Error creating conversation:", error);
            showToast(`Error creating conversation: ${error.message}`, true);
        }
    });
    
    // Save Supabase settings
    saveSupabaseSettings.addEventListener('click', () => {
        const url = supabaseUrlInput.value.trim();
        const key = supabaseKeyInput.value.trim();
        const storageType = storageTypeSelect.value;
        
        const settings = { type: storageType };
        
        if (storageType === 'supabase') {
            if (!url || !key) {
                showToast('Supabase URL and API key are required', true);
                return;
            }
            settings.supabaseUrl = url;
            
            // Only update key if it's not masked
            if (key !== '••••••••••••••••••••') {
                settings.supabaseKey = key;
            } else if (!storageSettings.supabaseKey) {
                showToast('Supabase API key is required', true);
                return;
            }
        }
        
        chrome.storage.local.set({ storageSettings: settings }, () => {
            storageSettings = settings;
            initializeStorage();
            showToast('Storage settings saved successfully!');
        });
    });
    
    // Initialize storage settings
    async function initializeStorage() {
        const result = await new Promise(resolve => {
            chrome.storage.local.get(['storageSettings'], (result) => {
                resolve(result.storageSettings || { type: 'none' });
            });
        });
        
        storageSettings = result;
        
        // Set UI values
        if (supabaseUrlInput && storageSettings.supabaseUrl) {
            supabaseUrlInput.value = storageSettings.supabaseUrl;
        }
        
        if (supabaseKeyInput && storageSettings.supabaseKey) {
            supabaseKeyInput.value = '••••••••••••••••••••';
        }
        
        if (storageTypeSelect) {
            storageTypeSelect.value = storageSettings.type || 'none';
        }
        
        // Initialize Supabase if needed
        if (storageSettings.type === 'supabase' && 
            storageSettings.supabaseUrl && 
            storageSettings.supabaseKey) {
            try {
                supabaseClient = new SupabaseClient(
                    storageSettings.supabaseUrl,
                    storageSettings.supabaseKey
                );
                
                // Initialize database tables if needed
                await supabaseClient.initializeDatabase();
                console.log("Supabase initialized successfully");
            } catch (error) {
                console.error("Error initializing Supabase:", error);
                showToast("Error connecting to Supabase", true);
            }
        }
        
        // Load existing conversation or create a new one
        loadOrCreateConversation();
    }
    
    // Load existing conversation or create a new one
    async function loadOrCreateConversation() {
        if (storageSettings.type === 'none') {
            // No storage, just start with empty conversation
            currentConversationId = null;
            clearChatHistory();
            return;
        }
        
        try {
            // Try to load the last used conversation
            const savedConversationId = await new Promise(resolve => {
                chrome.storage.local.get(['lastConversationId'], (result) => {
                    resolve(result.lastConversationId || null);
                });
            });
            
            if (savedConversationId) {
                await loadConversation(savedConversationId);
            } else {
                // Create a new default conversation
                await createNewConversation("New Conversation");
            }
        } catch (error) {
            console.error("Error loading conversation:", error);
            currentConversationId = null;
        }
    }
    
    // Load a specific conversation
    async function loadConversation(id) {
        if (!id) return;
        
        try {
            clearChatHistory();
            
            if (storageSettings.type === 'supabase' && supabaseClient) {
                const messages = await supabaseClient.getMessages(id);
                
                if (messages && messages.length > 0) {
                    // Hide welcome message
                    const welcomeMessage = document.getElementById('welcomeMessage');
                    if (welcomeMessage) {
                        welcomeMessage.style.display = 'none';
                    }
                    
                    // Render each message
                    for (const msg of messages) {
                        const className = msg.role === 'user' ? 'user-message' : 'ai-message';
                        // Handle file data if present
                        if (msg.file_data && msg.file_name) {
                            // Show file info message
                            addMessageToChat(`File: ${msg.file_name}`, `${className} file-info`, true);
                        }
                        // Add the main message content
                        addMessageToChat(msg.content, className, true);
                    }
                }
                
                // Update current conversation
                currentConversationId = id;
                chrome.storage.local.set({ lastConversationId: id });
                
                console.log(`Loaded conversation: ${id}`);
            } else if (storageSettings.type === 'local') {
                // Implement local storage conversation loading here
                const savedConversation = await new Promise(resolve => {
                    chrome.storage.local.get([`conversation_${id}`], (result) => {
                        resolve(result[`conversation_${id}`] || null);
                    });
                });
                
                if (savedConversation?.messages) {
                    // Hide welcome message
                    const welcomeMessage = document.getElementById('welcomeMessage');
                    if (welcomeMessage) {
                        welcomeMessage.style.display = 'none';
                    }
                    
                    // Render each message
                    for (const msg of savedConversation.messages) {
                        const className = msg.role === 'user' ? 'user-message' : 'ai-message';
                        addMessageToChat(msg.content, className, true);
                    }
                }
                
                // Update current conversation
                currentConversationId = id;
                chrome.storage.local.set({ lastConversationId: id });
            }
        } catch (error) {
            console.error("Error loading conversation:", error);
            showToast(`Error loading conversation: ${error.message}`, true);
        }
    }
    
    // Create a new conversation
    async function createNewConversation(title) {
        try {
            let newId;
            
            if (storageSettings.type === 'supabase' && supabaseClient) {
                // Create in Supabase
                const model = modelSelect.value;
                const conversation = await supabaseClient.createConversation(title, null, model);
                newId = conversation.id;
            } else if (storageSettings.type === 'local') {
                // Create in local storage
                newId = `local_${Date.now()}`;
                const newConversation = {
                    id: newId,
                    title: title,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    model: modelSelect.value,
                    messages: []
                };
                
                await new Promise(resolve => {
                    chrome.storage.local.set({ [`conversation_${newId}`]: newConversation }, resolve);
                });
            } else {
                // No storage
                clearChatHistory();
                return null;
            }
            
            // Set as current and save last used
            currentConversationId = newId;
            chrome.storage.local.set({ lastConversationId: newId });
            
            // Clear the chat for new conversation
            clearChatHistory();
            
            return newId;
        } catch (error) {
            console.error("Error creating conversation:", error);
            throw error;
        }
    }
    
    // Load the list of conversations
    async function loadConversationsList() {
        try {
            if (!conversationList) return;
            
            // Clear existing list
            conversationList.innerHTML = '';
            
            if (storageSettings.type === 'supabase' && supabaseClient) {
                // Load from Supabase
                const conversations = await supabaseClient.listConversations();
                
                if (conversations && conversations.length > 0) {
                    for (const convo of conversations) {
                        addConversationToList(convo.id, convo.title, new Date(convo.updated_at));
                    }
                } else {
                    conversationList.innerHTML = '<div class="no-conversations">No conversations found</div>';
                }
            } else if (storageSettings.type === 'local') {
                // Load from local storage
                chrome.storage.local.get(null, (result) => {
                    const conversations = [];
                    
                    // Find all conversation entries
                    for (const key in result) {
                        if (key.startsWith('conversation_')) {
                            const convo = result[key];
                            conversations.push({
                                id: convo.id,
                                title: convo.title,
                                updated_at: convo.updated_at
                            });
                        }
                    }
                    
                    if (conversations.length > 0) {
                        // Sort by updated date (newest first)
                        conversations.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
                        
                        for (const convo of conversations) {
                            addConversationToList(convo.id, convo.title, new Date(convo.updated_at));
                        }
                    } else {
                        conversationList.innerHTML = '<div class="no-conversations">No conversations found</div>';
                    }
                });
            } else {
                conversationList.innerHTML = '<div class="no-conversations">Storage not enabled</div>';
            }
        } catch (error) {
            console.error("Error loading conversations:", error);
            conversationList.innerHTML = `<div class="no-conversations">Error: ${error.message}</div>`;
        }
    }
    
    // Add a conversation to the list UI
    function addConversationToList(id, title, date) {
        const item = document.createElement('div');
        item.classList.add('conversation-item');
        if (id === currentConversationId) {
            item.classList.add('active');
        }
        
        const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
        
        item.innerHTML = `
            <div class="conversation-info">
                <div class="conversation-title">${title}</div>
                <div class="conversation-date">${formattedDate}</div>
            </div>
            <div class="conversation-actions">
                <button class="conversation-action-btn delete-btn" title="Delete">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/>
                    </svg>
                </button>
            </div>
        `;
        
        // Add click handler to load the conversation
        item.addEventListener('click', (e) => {
            if (!e.target.classList.contains('delete-btn')) {
                loadConversation(id);
                conversationsModal.style.display = 'none';
            }
        });
        
        // Add delete button handler
        const deleteBtn = item.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (confirm(`Delete conversation "${title}"?`)) {
                await deleteConversation(id);
                loadConversationsList();
            }
        });
        
        conversationList.appendChild(item);
    }
    
    // Delete a conversation
    async function deleteConversation(id) {
        try {
            if (storageSettings.type === 'supabase' && supabaseClient) {
                await supabaseClient.deleteConversation(id);
            } else if (storageSettings.type === 'local') {
                await new Promise(resolve => {
                    chrome.storage.local.remove([`conversation_${id}`], resolve);
                });
            }
            
            // If we deleted the current conversation, clear the current ID
            if (id === currentConversationId) {
                currentConversationId = null;
                chrome.storage.local.remove(['lastConversationId']);
                clearChatHistory();
            }
            
            return true;
        } catch (error) {
            console.error("Error deleting conversation:", error);
            showToast(`Error deleting conversation: ${error.message}`, true);
            return false;
        }
    }
    
    // Clear the chat history UI
    function clearChatHistory() {
        chatHistory.innerHTML = '';
        const welcomeMessage = document.createElement('div');
        welcomeMessage.id = 'welcomeMessage';
        welcomeMessage.className = 'welcome-message';
        
        // Get user name if available
        chrome.storage.local.get(['userName'], (result) => {
            const userName = result.userName || '';
            const greeting = userName ? `Hey ${userName}!` : 'Welcome to Auto GPT!';
            
            welcomeMessage.innerHTML = `
                <h3>${greeting}</h3>
                <p>I can help you with questions and analyze various file types:</p>
                <ul style="text-align: left; margin-top: 10px; color: rgba(255,255,255,0.8);">
                    <li>Images (PNG, JPEG, WebP)</li>
                    <li>Documents (PDF, TXT, Markdown)</li>
                    <li>Web content (HTML)</li>
                    <li>And more...</li>
                </ul>
                <p style="margin-top: 10px;">Click the paperclip icon to attach a file or just type a message to get started!</p>
            `;
        });
        
        chatHistory.appendChild(welcomeMessage);
    }
    
    // Save message to local storage
    async function saveMessageToLocalStorage(conversationId, role, content, fileData = null, fileName = null) {
        return new Promise((resolve, reject) => {
            chrome.storage.local.get([`conversation_${conversationId}`], (result) => {
                if (result[`conversation_${conversationId}`]) {
                    const conversation = result[`conversation_${conversationId}`];
                    conversation.messages.push({
                        role: role,
                        content: content,
                        file_data: fileData,
                        file_name: fileName
                    });
                    conversation.updated_at = new Date().toISOString();
                    
                    chrome.storage.local.set({ [`conversation_${conversationId}`]: conversation }, resolve);
                } else {
                    reject(new Error("Conversation not found"));
                }
            });
        });
    }

    async function handleSendMessage() {
        const promptText = promptInput.value.trim();
        const hasText = promptText !== '';
        const hasFile = attachedFile !== null;

        // Don't proceed if extracting or if we have neither text nor file
        if (isExtracting || (!hasText && !hasFile)) {
            return;
        }

        // Hide welcome message when user sends first message
        const welcomeMessage = document.getElementById('welcomeMessage');
        if (welcomeMessage) {
            welcomeMessage.style.display = 'none';
        }

        // Create a new conversation if none exists
        if (storageSettings.type !== 'none' && !currentConversationId) {
            currentConversationId = await createNewConversation("New Conversation");
        }

        // Get local AI settings to determine if we need an API key
        const localAISettings = await new Promise(resolve => {
            chrome.storage.local.get(['localAI'], (result) => {
                resolve(result.localAI || { aiSource: 'openrouter' });
            });
        });
        
        const usingLocalAI = localAISettings.aiSource !== 'openrouter';
        
        // Only check for OpenRouter API key if not using local AI
        if (!usingLocalAI) {
            const apiKeyResult = await new Promise(resolve => {
                chrome.storage.local.get(['openRouterApiKey'], (result) => {
                    resolve(result.openRouterApiKey);
                });
            });

            if (!apiKeyResult) {
                addMessageToChat("Please set your OpenRouter API Key first.", 'ai-message error');
                return;
            }
        } else {
            // Check if local AI model is set
            const modelName = localAISettings.aiSource === 'lmstudio' 
                ? localAISettings.lmStudioModel 
                : localAISettings.ollamaModel;
                
            if (!modelName) {
                addMessageToChat(`Please set a model name for ${localAISettings.aiSource === 'lmstudio' ? 'LM Studio' : 'Ollama'} in settings.`, 'ai-message error');
                return;
            }
        }

        // --- NEW: Gather conversation history for context window ---
        let conversationHistory = [];
        if (storageSettings.type !== 'none' && currentConversationId) {
            if (storageSettings.type === 'supabase' && supabaseClient) {
                try {
                    conversationHistory = await supabaseClient.getMessages(currentConversationId);
                } catch (e) {
                    conversationHistory = [];
                }
            } else if (storageSettings.type === 'local') {
                conversationHistory = await new Promise(resolve => {
                    chrome.storage.local.get([`conversation_${currentConversationId}`], (result) => {
                        const convo = result[`conversation_${currentConversationId}`];
                        resolve(convo?.messages || []);
                    });
                });
            }
        }
        // --- END NEW ---

        // Prepare message content - combine prompt with extracted content if available
        let combinedMessage = promptText;
        
        if (extractedFileContent) {
            // Format document content to include in the message
            const docPrefix = promptText ? `${promptText}\n\n` : "";
            combinedMessage = `${docPrefix}### Document: ${extractedFileContent.name} ###\n\n${extractedFileContent.text}\n\n${promptText ? `User query: ${promptText}` : "Please analyze this document."}`;
        }

        // Always add a user message to the UI - either text or a placeholder if only a file
        if (hasText) {
            addMessageToChat(promptText, 'user-message');
        } else if (hasFile && !hasText) {
            // If only a file is attached with no text, show a placeholder message
            addMessageToChat("Analyzing attached file", 'user-message');
        }
        
        // Process file attachment
        let fileData = null;
        let fileName = null;
        
        if (attachedFile) {
            // Display file info in chat
            addMessageToChat(`File: ${attachedFile.name} (${formatFileSize(attachedFile.size)})`, 'user-message file-info');
            
            // Save file info for storage
            fileName = attachedFile.name;
            if (attachedFile.type.startsWith('image/') || attachedFile.type === 'application/pdf') {
                fileData = `data:${attachedFile.type};base64,${attachedFileBase64}`;
            }
        }

        // Save user message to storage
        if (storageSettings.type !== 'none' && currentConversationId) {
            try {
                if (storageSettings.type === 'supabase' && supabaseClient) {
                    await supabaseClient.addMessage(
                        currentConversationId,
                        'user',
                        combinedMessage || 'Attached a file',
                        {},
                        null,
                        fileData,
                        fileName
                    );
                } else if (storageSettings.type === 'local') {
                    await saveMessageToLocalStorage(
                        currentConversationId,
                        'user',
                        combinedMessage || 'Attached a file',
                        fileData,
                        fileName
                    );
                }
            } catch (error) {
                console.error("Error saving message:", error);
            }
        }

        const thinkingMessage = addMessageToChat('', 'ai-message thinking');
        sendButton.disabled = true;
        promptInput.disabled = true;

        try {
            // Get user name for context
            const userName = await new Promise(resolve => {
                chrome.storage.local.get(['userName'], (result) => {
                    resolve(result.userName || null);
                });
            });

            // Get API key (null is OK if using local AI)
            const apiKey = await getApiKeyForModel(modelSelect.value);

            // --- NEW: Build full context window for OpenRouter API ---
            // Only keep the last N messages to fit in the context window (e.g., 20)
            const MAX_CONTEXT_MESSAGES = 20;
            let contextMessages = [];
            if (conversationHistory.length > 0) {
                // Map to OpenRouter format
                contextMessages = conversationHistory.slice(-MAX_CONTEXT_MESSAGES).map(msg => {
                    if (msg.role === 'user') {
                        return { role: 'user', content: msg.content };
                    }
                    return { role: 'assistant', content: msg.content };
                });
            }
            // Add the new user message
            contextMessages.push({ role: 'user', content: combinedMessage });
            // --- END NEW ---

            // When sending to API, use the full context window
            const responseObj = await callOpenRouterAPI(
                apiKey, 
                contextMessages, 
                attachedFile, 
                attachedFileBase64, 
                userName,
                !!extractedFileContent // Flag indicating we have extracted content
            );
            
            // Remove thinking message if it exists
            try {
                thinkingMessage?.parentNode?.removeChild(thinkingMessage);
            } catch (e) {
                console.warn("Could not remove thinking message:", e);
            }
            
            // Add the AI response with reasoning dropdown if present
            addMessageToChat(responseObj.content, 'ai-message', false, responseObj.reasoning, null);
            
            // Save AI response to storage
            if (storageSettings.type !== 'none' && currentConversationId) {
                try {
                    if (storageSettings.type === 'supabase' && supabaseClient) {
                        await supabaseClient.addMessage(
                            currentConversationId,
                            'assistant',
                            responseObj.content,
                            {}
                        );
                    } else if (storageSettings.type === 'local') {
                        await saveMessageToLocalStorage(
                            currentConversationId,
                            'assistant',
                            responseObj.content
                        );
                    }
                } catch (error) {
                    console.error("Error saving AI response:", error);
                }
            }
        } catch (error) {
            console.error("API Error:", error);
            
            // Remove thinking message if it exists
            try {
                thinkingMessage?.parentNode?.removeChild(thinkingMessage);
            } catch (e) {
                console.warn("Could not remove thinking message:", e);
            }
            
            addMessageToChat(`Error: ${error.message}`, 'ai-message error');
        } finally {
            promptInput.value = '';
            promptInput.style.height = 'auto';
            promptInput.disabled = false;
            clearFileInput();
            updateSendButtonState();
            promptInput.focus();
        }
    }

    // Update callOpenRouterAPI to accept contextMessages instead of a single prompt
    async function callOpenRouterAPI(apiKey, contextMessages, file, fileBase64, userName = null, hasExtractedContent = false) {
        const localAISettings = await new Promise(resolve => {
            chrome.storage.local.get(['localAI'], (result) => {
                resolve(result.localAI || { aiSource: 'openrouter' });
            });
        });
        const advancedSettings = await new Promise(resolve => {
            chrome.storage.local.get(['advancedApiSettings'], (result) => {
                resolve(result.advancedApiSettings || { 
                    enableCaching: true,
                    enableMiddleOut: true 
                });
            });
        });
        const usingLocalAI = localAISettings.aiSource !== 'openrouter';
        let messages = contextMessages;
        if (userName) {
            messages = [
                {
                    role: "system",
                    content: `You are Auto GPT, an intelligent AI assistant. You're speaking with ${userName}. Be helpful, concise, and friendly.`
                },
                ...messages
            ];
        }
        const selectedModel = modelSelect.value;
        if (usingLocalAI) {
            // Call Local AI (Ollama or LM Studio)
            try {
                const aiType = localAISettings.aiSource;
                const modelName = aiType === 'lmstudio' ? localAISettings.lmStudioModel : localAISettings.ollamaModel;
                const baseUrl = aiType === 'lmstudio' ? localAISettings.lmStudioUrl : localAISettings.ollamaUrl;
                
                if (!baseUrl || !modelName) {
                    throw new Error(`${aiType === 'lmstudio' ? 'LM Studio' : 'Ollama'} settings not configured`);
                }
                
                const apiUrl = `${baseUrl.replace(/\/$/, '')}/v1/chat/completions`;
                
                console.log(`Using Local AI (${aiType}): ${modelName}`);

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: modelName,
                        messages: messages,
                        max_tokens: 2048,
                        temperature: 0.7,
                        stream: false
                    })
        });

        if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(`Local AI error: ${errorData.error || response.statusText}`);
        }

        const data = await response.json();
                // If reasoning is present, return as {content, reasoning}
                const content = data.choices?.[0]?.message?.content || "No response received from the model.";
                const reasoning = data.choices?.[0]?.message?.reasoning || null;
                return { content, reasoning };
                
            } catch (error) {
                console.error("Local AI Error:", error);
                throw new Error(`Local AI error: ${error.message}`);
            }
        } else {
            try {
                if (!apiKey) throw new Error("API Key not provided");
                const headers = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                };
                const enableCaching = advancedSettings.enableCaching !== false;
                const enableMiddleOut = advancedSettings.enableMiddleOut !== false;
                const requestBody = {
                    model: selectedModel,
                    messages: messages,
                    max_tokens: 2048,
                    temperature: 0.7,
                    middle_out: enableMiddleOut,
                    route: "fallback",
                    cache: enableCaching,
                    stream: true // Enable streaming
                };
                const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(requestBody)
                });
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(`API error (${response.status}): ${errorData.error || response.statusText}`);
                }
                // Stream response
                const reader = response.body.getReader();
                let result = '';
                let reasoning = '';
                let done = false;
                while (!done) {
                    const { value, done: doneReading } = await reader.read();
                    done = doneReading;
                    if (value) {
                        const chunk = new TextDecoder().decode(value);
                        for (const line of chunk.split('\n')) {
                            if (line.startsWith('data:')) {
                                const data = line.replace('data:', '').trim();
                                if (data && data !== '[DONE]') {
                                    try {
                                        const parsed = JSON.parse(data);
                                        const contentDelta = parsed.choices?.[0]?.delta?.content;
                                        const reasoningDelta = parsed.choices?.[0]?.delta?.reasoning;
                                        if (contentDelta) {
                                            result += contentDelta;
                                            // Update the last message in chat
                                            const lastMsg = chatHistory.lastElementChild;
                                            if (lastMsg) {
                                                lastMsg.querySelector('.markdown-body').innerHTML = renderMarkdown(result);
                                            }
                                        }
                                        if (reasoningDelta) {
                                            reasoning += reasoningDelta;
                                            // If dropdown is open, update reasoning content
                                            if (lastMsg) {
                                                const contentDiv = lastMsg.querySelector('.reasoning-content.open');
                                                if (contentDiv) {
                                                    contentDiv.innerHTML = renderMarkdown(reasoning);
                                                }
                                            }
                                        }
                                    } catch (e) {}
                                }
                            }
                        }
                    }
                }
                return { content: result || 'No response received from the model.', reasoning: reasoning || null };
            } catch (error) {
                console.error("OpenRouter API Error:", error);
                throw new Error(`API error: ${error.message}`);
            }
        }
    }

    // Function to add a message to the chat history
    function addMessageToChat(text, className, skipAnimation = false, reasoning = null, reasoningStream = null) {
        if (!text && !className.includes('thinking')) {
            console.warn('Attempted to add empty message to chat');
            return null;
        }
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', ...className.split(' '));
        if (skipAnimation) {
            messageDiv.style.animation = 'none';
        }
        // Render markdown
        const p = document.createElement('div');
        p.className = 'markdown-body';
        p.innerHTML = renderMarkdown(text);
        messageDiv.appendChild(p);
        // If reasoning is present, add dropdown
        if (reasoning !== null || reasoningStream !== null) {
            const dropdown = document.createElement('div');
            dropdown.className = 'reasoning-dropdown';
            const toggle = document.createElement('div');
            toggle.className = 'reasoning-toggle';
            toggle.textContent = 'Show Reasoning';
            const content = document.createElement('div');
            content.className = 'reasoning-content';
            if (reasoningStream) {
                content.innerHTML = `<span class="shimmer">Streaming reasoning...</span>`;
            } else {
                content.innerHTML = renderMarkdown(reasoning || '');
            }
            toggle.addEventListener('click', () => {
                content.classList.toggle('open');
                if (content.classList.contains('open')) {
                    toggle.textContent = 'Hide Reasoning';
                    if (reasoningStream) {
                        // Replace shimmer with streamed reasoning
                        content.innerHTML = renderMarkdown(reasoningStream());
                    }
                } else {
                    toggle.textContent = 'Show Reasoning';
                }
            });
            dropdown.appendChild(toggle);
            dropdown.appendChild(content);
            messageDiv.appendChild(dropdown);
        }
        chatHistory.appendChild(messageDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;
        return messageDiv;
    }

    // Function to read a file as base64
    function readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                const base64String = event.target.result.split(',')[1];
                resolve(base64String);
            };
            
            reader.onerror = (error) => {
                reject(error);
            };
            
            reader.readAsDataURL(file);
        });
    }

    // Function to format file size
    function formatFileSize(bytes) {
        if (bytes < 1024) {
            return `${bytes} bytes`;
        } 
        
        if (bytes < 1024 * 1024) {
            return `${(bytes / 1024).toFixed(1)} KB`;
        } 
        
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    // 1. Load and populate model dropdown with search
    async function populateModelDropdown(filter = '') {
        const response = await fetch('model.json');
        const data = await response.json();
        const models = data.data;
        const modelSelect = document.getElementById('modelSelect');
        modelSelect.innerHTML = '';

        // Helper to add optgroup
        function addOptGroup(label, models) {
            if (models.length === 0) return;
            const group = document.createElement('optgroup');
            group.label = label;
            for (const model of models) {
                // Filter by search
                if (filter && !model.name.toLowerCase().includes(filter) && !model.id.toLowerCase().includes(filter)) continue;
                const option = document.createElement('option');
                option.value = model.id;
                option.textContent = model.name;
                group.appendChild(option);
            }
            if (group.children.length > 0) modelSelect.appendChild(group);
        }

        // Filter models by vendor/category
        const googleModels = models.filter(m => m.id.startsWith('google/gemini'));
        const openaiModels = models.filter(m => m.id.startsWith('openai/'));
        const anthropicModels = models.filter(m => m.id.startsWith('anthropic/'));
        const grokModels = models.filter(m => m.id.startsWith('xai/') || m.id.startsWith('grok/'));
        const xaiModels = models.filter(m => m.id.startsWith('xai/'));
        const deepseekModels = models.filter(m => m.id.startsWith('deepseek/'));
        const freeModels = models.filter(m => m.id.endsWith(':free'));
        const qwenModels = models.filter(m => m.id.startsWith('qwen/'));
        const openrouterSpecial = models.filter(m => m.id === 'openrouter/optimus-alpha' || m.id === 'openrouter/quasar-alpha');

        addOptGroup('Google (Gemini)', googleModels);
        addOptGroup('OpenAI', openaiModels);
        addOptGroup('Anthropic', anthropicModels);
        addOptGroup('Grok', grokModels);
        addOptGroup('X-ai', xaiModels);
        addOptGroup('Deepseek', deepseekModels);
        addOptGroup('Qwen', qwenModels);
        addOptGroup('Free Models', freeModels);
        addOptGroup('OpenRouter Special', openrouterSpecial);
    }

    // Call on DOMContentLoaded
    populateModelDropdown();

    // 2. Add model search/filtering
    const modelSearchInput = document.getElementById('modelSearchInput');
    if (modelSearchInput) {
        modelSearchInput.addEventListener('input', (e) => {
            const filter = e.target.value.trim().toLowerCase();
            populateModelDropdown(filter);
        });
    }

    // 3. Render chat messages as markdown (fix heading rendering)
    function renderMarkdown(text) {
        if (window.marked) {
            // Use marked with gfm and breaks enabled
            return window.marked.parse(text, { gfm: true, breaks: true });
        }
        // Fallback: basic line breaks and code
        return text
            .replace(/\n/g, '<br>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/\*([^*]+)\*/g, '<em>$1</em>')
            .replace(/^### (.*)$/gm, '<h3>$1</h3>')
            .replace(/^## (.*)$/gm, '<h2>$1</h2>')
            .replace(/^# (.*)$/gm, '<h1>$1</h1>');
    }

    // Helper: Add shimmer effect CSS for reasoning
    function addShimmerStyle() {
        if (document.getElementById('shimmer-style')) return;
        const style = document.createElement('style');
        style.id = 'shimmer-style';
        style.textContent = `
        .shimmer {
            background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
            color: transparent !important;
            border-radius: 4px;
            min-height: 1em;
        }
        @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
        }
        .reasoning-dropdown { margin-top: 8px; }
        .reasoning-toggle { cursor: pointer; color: var(--primary-color, #007bff); font-weight: 500; }
        .reasoning-content { margin-top: 4px; display: none; }
        .reasoning-content.open { display: block; }
        `;
        document.head.appendChild(style);
    }
    addShimmerStyle();

    // 2. Use GoogleAI key for Google models, fallback to OpenRouter key
    async function getApiKeyForModel(modelId) {
        return await new Promise(resolve => {
            chrome.storage.local.get(['openRouterApiKey', 'googleAIKey'], (result) => {
                if (modelId.startsWith('google/')) {
                    if (result.googleAIKey) return resolve(result.googleAIKey);
                }
                if (result.openRouterApiKey) return resolve(result.openRouterApiKey);
                // Fallback to OpenRouter public key
                return resolve('org-fallback-key');
            });
        });
    }

    // 4. After first user/AI message, update conversation title with AI-generated title (only once)
    let aiTitleGenerated = false;
    async function updateConversationTitleWithAI(message) {
        if (aiTitleGenerated || !currentConversationId) return;
        aiTitleGenerated = true;
        // Use OpenRouter to generate a title
        const apiKey = await getApiKeyForModel(modelSelect.value);
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: modelSelect.value,
                messages: [
                    { role: 'system', content: 'Summarize the following conversation in 5 words or less, as a title.' },
                    { role: 'user', content: message }
                ],
                max_tokens: 12
            })
        });
        const data = await response.json();
        const title = data.choices?.[0]?.message?.content?.replace(/\n/g, '').trim() || 'Conversation';
        // Update conversation title in storage
        if (storageSettings.type === 'supabase' && supabaseClient) {
            await supabaseClient.updateConversationTitle(currentConversationId, title);
        } else if (storageSettings.type === 'local') {
            chrome.storage.local.get([`conversation_${currentConversationId}`], (result) => {
                const convo = result[`conversation_${currentConversationId}`];
                if (convo) {
                    convo.title = title;
                    chrome.storage.local.set({ [`conversation_${currentConversationId}`]: convo });
                }
            });
        }
        loadConversationsList();
    }
    // In handleSendMessage, after first user/AI message:
    if (!aiTitleGenerated && promptText) {
        updateConversationTitleWithAI(promptText);
    }
});