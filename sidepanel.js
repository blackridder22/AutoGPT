// Global variable to store webhooks data
let appWebhooksData = null;
let activeWebhookOverrideId = null; // Stores the ID of the webhook selected by slash command

// Function to update the display of the active webhook
function updateActiveWebhookDisplay() {
    const displayElement = document.getElementById('activeWebhookDisplay');
    if (!displayElement) {
        console.error("activeWebhookDisplay element not found.");
        return;
    }

    let displayText = '';
    let showDisplay = false;

    if (!appWebhooksData || !appWebhooksData.webhooks) {
        // This case should ideally be rare if initializeWebhooksData ensures appWebhooksData and .webhooks are always arrays
        displayText = '<span style="color: #ff6b6b;">Webhook data not loaded or invalid.</span>';
        showDisplay = true;
    } else if (activeWebhookOverrideId) {
        const overrideWebhook = appWebhooksData.webhooks.find(wh => wh.id === activeWebhookOverrideId);
        if (overrideWebhook) {
            displayText = `Using: <strong>${overrideWebhook.name}</strong> <button id="clearWebhookOverrideBtn" class="clear-override-btn" title="Clear override and use default">✖</button>`;
            showDisplay = true;
        } else {
            console.error("Invalid activeWebhookOverrideId:", activeWebhookOverrideId, "Clearing it.");
            activeWebhookOverrideId = null; // Clear invalid override and fall through to default logic
            // No explicit 'else' here, will re-evaluate based on cleared activeWebhookOverrideId in the next conditions
        }
    }

    // This block will now execute if activeWebhookOverrideId was null initially, or cleared due to being invalid
    if (!activeWebhookOverrideId) {
        if (appWebhooksData.defaultWebhookId) {
            const defaultWebhook = appWebhooksData.webhooks.find(wh => wh.id === appWebhooksData.defaultWebhookId);
            if (defaultWebhook) {
                displayText = `Default: <strong>${defaultWebhook.name}</strong>`;
                showDisplay = true;
            } else {
                // Default ID exists but points to a non-existent webhook
                displayText = '<span style="color: #ff6b6b;">Default webhook invalid. Please re-set in settings.</span>';
                showDisplay = true;
            }
        } else if (appWebhooksData.webhooks.length > 0) {
            // No default set, but webhooks exist
            displayText = '<span style="color: #ffcc00;">No default webhook set. Using first available. Select one in settings.</span>';
            // Potentially show the first available as a temporary measure, or just the warning.
            // For now, just the warning to prompt user action.
            showDisplay = true;
        } else {
            // No webhooks configured at all
            displayText = '<span style="color: #ff6b6b;">No webhooks configured. Add one in settings.</span>';
            showDisplay = true;
        }
    }


    displayElement.innerHTML = displayText;
    displayElement.style.display = showDisplay ? 'block' : 'none';

    // Event listener for the clear override button (if it exists)
    // Manage listener to avoid duplicates
    if (displayElement._clearOverrideClickHandler) {
        displayElement.removeEventListener('click', displayElement._clearOverrideClickHandler);
    }
    displayElement._clearOverrideClickHandler = function(event) {
        const target = event.target;
        // Check if the click is on the button itself or its direct children (like the '✖' text node if it's not part of the button's innerHTML)
        if (target.id === 'clearWebhookOverrideBtn' || target.classList.contains('clear-override-btn') || target.closest('.clear-override-btn')) {
            activeWebhookOverrideId = null;
            updateActiveWebhookDisplay();
            const promptInputElement = document.getElementById('promptInput');
            if (promptInputElement) promptInputElement.focus();
        }
    };
    displayElement.addEventListener('click', displayElement._clearOverrideClickHandler);
}

document.addEventListener('DOMContentLoaded', () => {
    const promptInput = document.getElementById('promptInput');
    const sendButton = document.getElementById('sendButton');
    const chatHistory = document.getElementById('chatHistory');
    const attachFileButton = document.getElementById('attachFileButton');
    const fileInput = document.getElementById('fileInput');
    const fileNameDisplay = document.getElementById('fileName');
    const filePreviewContainer = document.getElementById('filePreviewContainer');
    const removeFileButton = document.getElementById('removeFileButton');
    // const modelSelect = document.getElementById('modelSelect'); // Removed
    
    // Settings elements
    const settingsButton = document.getElementById('settingsButton');
    const settingsModal = document.getElementById('settingsModal');
    const closeButton = document.querySelector('.close-button');
    const userNameInput = document.getElementById('userNameInput');
    const saveUserNameButton = document.getElementById('saveUserName');
    // const openRouterKeyInput = document.getElementById('openRouterKeyInput'); // Removed
    // const googleAIKeyInput = document.getElementById('googleAIKeyInput'); // Removed
    // const openAIKeyInput = document.getElementById('openAIKeyInput'); // Removed
    // const anthropicKeyInput = document.getElementById('anthropicKeyInput'); // Removed
    // const saveApiKeysButton = document.getElementById('saveApiKeys'); // Removed
    const webhookUrlInput = document.getElementById('webhookUrlInput'); // Added
    const saveWebhookUrlButton = document.getElementById('saveWebhookUrlButton'); // Added
    const accentColorPicker = document.getElementById('accentColorPicker');
    const saveThemeButton = document.getElementById('saveTheme');
    const wallpaperOptions = document.querySelectorAll('.wallpaper-option');
    
    // Local AI settings elements - REMOVED
    // const lmStudioUrlInput = document.getElementById('lmStudioUrlInput');
    // const lmStudioModelInput = document.getElementById('lmStudioModelInput');
    // const ollamaUrlInput = document.getElementById('ollamaUrlInput');
    // const ollamaModelInput = document.getElementById('ollamaModelInput');
    // const aiSourceSelect = document.getElementById('aiSourceSelect');
    // const saveLocalAISettings = document.getElementById('saveLocalAISettings');

    // OpenRouter API URL - REMOVED
    // const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
    
    // Initialize document parser and file handling variables
    const documentParser = new DocumentParser();
    console.log("Document parser initialized:", documentParser ? "success" : "failed");

    // Helper function to generate hyphenless UUID
    function generateUUID() {
        return crypto.randomUUID().replace(/-/g, '');
    }

    async function initializeWebhooksData() {
        const result = await new Promise(resolve => chrome.storage.local.get(['webhooksData', 'webhookUrl'], resolve));
        let currentWebhooksData = result.webhooksData;
        const oldWebhookUrl = result.webhookUrl; // Legacy single webhook URL

        if (currentWebhooksData) {
            if (typeof currentWebhooksData !== 'object' || currentWebhooksData === null) {
                console.warn("Existing webhooksData is not an object. Reinitializing.");
                currentWebhooksData = null;
            } else {
                if (!Array.isArray(currentWebhooksData.webhooks)) {
                    console.warn("webhooksData.webhooks is not an array. Resetting.");
                    currentWebhooksData.webhooks = [];
                }
                if (!currentWebhooksData.hasOwnProperty('defaultWebhookId')) {
                    currentWebhooksData.defaultWebhookId = null;
                } else if (currentWebhooksData.defaultWebhookId !== null && typeof currentWebhooksData.defaultWebhookId !== 'string') {
                    console.warn("webhooksData.defaultWebhookId is not a string or null. Resetting to null.");
                    currentWebhooksData.defaultWebhookId = null;
                }
                // If defaultWebhookId is set, ensure it exists in the webhooks array
                if (currentWebhooksData.defaultWebhookId &&
                    !currentWebhooksData.webhooks.find(wh => wh.id === currentWebhooksData.defaultWebhookId)) {
                    console.warn("Default webhook ID does not exist in webhooks list. Resetting to null.");
                    currentWebhooksData.defaultWebhookId = null;
                }
                console.log("Existing webhooksData found and validated:", currentWebhooksData);
                return currentWebhooksData;
            }
        }

        if (!currentWebhooksData && oldWebhookUrl) {
            console.log("Old webhookUrl found, migrating:", oldWebhookUrl);
            const newId = generateUUID();
            currentWebhooksData = {
                webhooks: [{
                    id: newId,
                    name: "Default Webhook",
                    url: oldWebhookUrl
                }],
                defaultWebhookId: newId
            };
            await new Promise(resolve => chrome.storage.local.set({ webhooksData: currentWebhooksData }, resolve));
            await new Promise(resolve => chrome.storage.local.remove('webhookUrl', resolve));
            console.log("Migrated to new webhooksData:", currentWebhooksData);
            return currentWebhooksData;
        } else if (!currentWebhooksData) {
            console.log("No valid webhook data, initializing fresh.");
            currentWebhooksData = {
                webhooks: [],
                defaultWebhookId: null
            };
            await new Promise(resolve => chrome.storage.local.set({ webhooksData: currentWebhooksData }, resolve));
            return currentWebhooksData;
        }
        return currentWebhooksData || { webhooks: [], defaultWebhookId: null }; // Fallback
    }

    // --- BEGIN Reasoning display feature ---
    function injectReasoningStyles() {
        const styleId = 'reasoning-styles';
        if (document.getElementById(styleId)) {
            return; // Styles already injected
        }
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .reasoning-toggle-button {
                cursor: pointer;
                color: var(--accent-color, #007bff);
                text-decoration: none;
                display: inline-block;
                margin-top: 8px;
                margin-bottom: 4px;
                font-style: normal;
                padding: 4px 8px;
                border: 1px solid var(--accent-color, #007bff);
                border-radius: 4px;
                font-size: 0.9em;
                user-select: none;
            }
            .reasoning-toggle-button:hover {
                background-color: rgba(0, 123, 255, 0.1);
            }
            .reasoning-content {
                display: none;
                margin-top: 5px;
                padding: 10px;
                background-color: var(--message-bg-color, rgba(128, 128, 128, 0.05));
                border: 1px solid var(--border-color, #eee);
                border-radius: 4px;
                position: relative;
                overflow: hidden;
                white-space: pre-wrap;
                word-wrap: break-word;
            }
            .reasoning-content.open {
                display: block;
            }
            .reasoning-content.shimmering::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(
                    to right,
                    transparent 20%,
                    rgba(255, 255, 255, 0.4) 50%,
                    transparent 80%
                );
                animation: shimmer 1.2s linear infinite;
            }
            @keyframes shimmer {
                0% { left: -100%; }
                100% { left: 100%; }
            }
            .typewriter-cursor {
                display: inline-block;
                width: 2px;
                height: 1em;
                background-color: currentColor;
                animation: blink 0.7s infinite;
                margin-left: 1px;
                vertical-align: baseline;
            }
            @keyframes blink {
                0%, 100% { opacity: 1; }
                50% { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    async function typewriterEffect(element, text, speed = 30) {
        element.innerHTML = ''; // Clear previous content
        const cursor = document.createElement('span');
        cursor.className = 'typewriter-cursor';
        
        const textNode = document.createTextNode('');
        element.appendChild(textNode);
        element.appendChild(cursor);

        for (let i = 0; i < text.length; i++) {
            textNode.nodeValue += text[i];
            await new Promise(resolve => setTimeout(resolve, speed));
        }
        cursor.remove(); // Remove cursor when done typing plain text
    }

    injectReasoningStyles(); // Inject styles on load
    // --- END Reasoning display feature ---
    
    // File variables
    let attachedFile = null;
    let attachedFileBase64 = null;
    let extractedFileContent = null;
    let isExtracting = false;
    
    // Initialize UI state
    updateSendButtonState();
    
    // Get user settings from storage
    loadUserSettings();
    
    // Handle textarea input and resize, and slash commands for webhooks
    let suggestionsContainer = null; // Keep a reference

    function getOrCreateWebhookSuggestionsContainer() {
        if (suggestionsContainer && document.body.contains(suggestionsContainer)) {
            return suggestionsContainer;
        }
        suggestionsContainer = document.getElementById('webhookSuggestions');
        if (!suggestionsContainer) {
            suggestionsContainer = document.createElement('div');
            suggestionsContainer.id = 'webhookSuggestions';
            suggestionsContainer.className = 'suggestions-list'; // For potential CSS styling

            // Basic styling - should be enhanced with CSS
            suggestionsContainer.style.display = 'none';
            suggestionsContainer.style.position = 'absolute';
            suggestionsContainer.style.backgroundColor = 'var(--input-bg-color, #fff)'; // Use theme variable
            suggestionsContainer.style.border = '1px solid var(--border-color, #ccc)';
            suggestionsContainer.style.borderRadius = '4px';
            suggestionsContainer.style.zIndex = '1000'; // Ensure it's on top
            suggestionsContainer.style.maxHeight = '150px';
            suggestionsContainer.style.overflowY = 'auto';
            suggestionsContainer.style.width = promptInput.offsetWidth + 'px'; // Match promptInput width

            // Position below promptInput
            // Ensure promptInput.parentNode is suitable for relative positioning if needed.
            // For simplicity, appending to promptInput's parent and using absolute positioning relative to it.
            if (promptInput.parentNode) {
                 // Make parent relative if it's not already, for better positioning
                if (getComputedStyle(promptInput.parentNode).position === 'static') {
                    promptInput.parentNode.style.position = 'relative';
                }
                promptInput.parentNode.appendChild(suggestionsContainer);
                // Adjust position:
                suggestionsContainer.style.top = (promptInput.offsetTop + promptInput.offsetHeight) + 'px';
                suggestionsContainer.style.left = promptInput.offsetLeft + 'px';

            } else {
                console.error("promptInput parentNode is null, cannot append suggestionsContainer.");
                document.body.appendChild(suggestionsContainer); // Fallback, might not be positioned correctly
            }
        }
        return suggestionsContainer;
    }

    promptInput.addEventListener('input', () => {
        promptInput.style.height = 'auto'; // Auto-resize textarea
        promptInput.style.height = `${promptInput.scrollHeight}px`;
        updateSendButtonState();

        const text = promptInput.value;
        const currentSuggestionsContainer = getOrCreateWebhookSuggestionsContainer();

        if (!appWebhooksData || !appWebhooksData.webhooks) {
            currentSuggestionsContainer.style.display = 'none';
            return;
        }

        if (text.startsWith('/') && text.length >= 1) { // Show even with just '/'
            const query = text.substring(1).toLowerCase();
            const matchedWebhooks = appWebhooksData.webhooks.filter(wh =>
                wh.name.toLowerCase().includes(query)
            );

            currentSuggestionsContainer.innerHTML = ''; // Clear previous suggestions
            if (matchedWebhooks.length > 0) {
                matchedWebhooks.forEach(webhook => {
                    const item = document.createElement('div');
                    item.className = 'suggestion-item'; // For styling and event delegation
                    item.textContent = webhook.name;
                    item.dataset.id = webhook.id;
                    item.dataset.name = webhook.name; // For confirmation or display

                    // Basic item styling
                    item.style.padding = '8px 12px';
                    item.style.cursor = 'pointer';
                    item.style.borderBottom = '1px solid var(--border-color, #eee)';
                    item.onmouseenter = () => item.style.backgroundColor = 'var(--hover-bg-color, #f0f0f0)';
                    item.onmouseleave = () => item.style.backgroundColor = 'var(--input-bg-color, #fff)';

                    currentSuggestionsContainer.appendChild(item);
                });
                currentSuggestionsContainer.style.width = promptInput.offsetWidth + 'px'; // Adjust width
                currentSuggestionsContainer.style.top = (promptInput.offsetTop + promptInput.offsetHeight) + 'px'; // Adjust position
                currentSuggestionsContainer.style.left = promptInput.offsetLeft + 'px';
                currentSuggestionsContainer.style.display = 'block';
            } else {
                currentSuggestionsContainer.style.display = 'none';
            }
        } else {
            currentSuggestionsContainer.innerHTML = '';
            currentSuggestionsContainer.style.display = 'none';
        }
    });

    // Delegated click listener for suggestions
    // Ensure this is only added once. If getOrCreate... is called multiple times,
    // this might be re-added. Consider adding it outside if container is stable.
    // For now, assuming getOrCreateWebhookSuggestionsContainer() is robust.
    const sContainer = getOrCreateWebhookSuggestionsContainer(); // Get it once for listener
    if (sContainer && !sContainer._suggestionClickHandlerAttached) {
        sContainer.addEventListener('click', function(event) {
            const target = event.target;
            if (target.classList.contains('suggestion-item') && target.dataset.id) {
                activeWebhookOverrideId = target.dataset.id;
                promptInput.value = ''; // Clear the prompt input
                updateActiveWebhookDisplay(); // Update the display above prompt

                const currentSuggestionsContainer = getOrCreateWebhookSuggestionsContainer(); // Re-get in case it was recreated
                currentSuggestionsContainer.innerHTML = ''; // Clear suggestions
                currentSuggestionsContainer.style.display = 'none'; // Hide suggestions
                promptInput.focus(); // Return focus to prompt
            }
        });
        sContainer._suggestionClickHandlerAttached = true; // Mark as attached
    }

    // Hide suggestions if promptInput loses focus, unless a suggestion is clicked
    // This requires careful handling to not hide before click on suggestion is processed.
    // A common way is a small timeout on blur.
    let blurTimeoutId = null;
    promptInput.addEventListener('blur', () => {
        // Use a timeout to delay hiding, allowing click event on suggestions to fire
        blurTimeoutId = setTimeout(() => {
            const currentSuggestionsContainer = getOrCreateWebhookSuggestionsContainer();
            if (currentSuggestionsContainer) {
                 currentSuggestionsContainer.style.display = 'none';
            }
        }, 150); // 150ms delay
    });

    // When focusing promptInput, if a click on a suggestion is about to happen,
    // the blur event's timeout might hide the suggestions. Clear that timeout.
    // Also, if it's a slash command, re-trigger input to show suggestions.
    promptInput.addEventListener('focus', () => {
        clearTimeout(blurTimeoutId);
        // If text starts with '/', trigger input event to potentially show suggestions
        if (promptInput.value.startsWith('/')) {
            promptInput.dispatchEvent(new Event('input', { bubbles:true }));
        }
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

    // Handle model selection changes - REMOVED
    // modelSelect.addEventListener('change', function() {
    //     const selectedModel = this.value;
    //     const isPaid = !selectedModel.includes(':free');
        
    //     if (isPaid) {
    //         // Check if we have an API key
    //         chrome.storage.local.get(['openRouterApiKey'], (result) => {
    //             if (!result.openRouterApiKey) {
    //                 addModelInfoMessage(selectedModel, true);
    //             } else {
    //                 addModelInfoMessage(selectedModel, false);
    //             }
    //         });
    //     } else {
    //         addModelInfoMessage(selectedModel, false);
    //     }
    // });

    // Settings Modal functionality
    settingsButton.addEventListener('click', () => {
        settingsModal.style.display = 'block';
        loadSettingsValues();
        renderWebhookList(); // Render the list when settings are opened
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

    // Save Webhook URL - This button (saveWebhookUrlButton) and its input (webhookUrlInput) are from the old single webhook UI.
    // They will be removed from HTML. The new logic is handled by addWebhookButton and the new inputs.
    // This listener can be removed.
    // saveWebhookUrlButton.addEventListener('click', () => { ... });

    // New Webhook Management Logic
    const addWebhookButton = document.getElementById('addWebhookButton');
    const newWebhookNameInput = document.getElementById('newWebhookNameInput');
    const newWebhookUrlInput = document.getElementById('newWebhookUrlInput');

    async function handleSetDefaultWebhook(webhookId) {
        if (!appWebhooksData) {
            showToast("Error: Webhook data not available.", true);
            console.error("handleSetDefaultWebhook: appWebhooksData is missing.");
            return;
        }
        const originalDefaultId = appWebhooksData.defaultWebhookId;
        appWebhooksData.defaultWebhookId = webhookId;

        try {
            await new Promise((resolve, reject) => {
                chrome.storage.local.set({ webhooksData: appWebhooksData }, () => {
                    if (chrome.runtime.lastError) {
                        return reject(chrome.runtime.lastError);
                    }
                    resolve();
                });
            });
            showToast("Webhook set as default.");
        } catch (error) {
            showToast("Error setting default webhook. Please try again.", true);
            console.error("Failed to save new default webhook:", error);
            appWebhooksData.defaultWebhookId = originalDefaultId; // Rollback
        }
        renderWebhookList();
        updateActiveWebhookDisplay(); // Update display after setting default
    }

    async function handleDeleteWebhook(webhookId) {
        if (!confirm("Are you sure you want to delete this webhook?")) {
            return;
        }

        if (!appWebhooksData || !appWebhooksData.webhooks) {
            showToast("Error: Webhook data not available.", true);
            console.error("handleDeleteWebhook: appWebhooksData or webhooks array is missing.");
            return;
        }

        const originalWebhooks = JSON.parse(JSON.stringify(appWebhooksData.webhooks));
        const originalDefaultId = appWebhooksData.defaultWebhookId;

        // Filter out the webhook to be deleted
        appWebhooksData.webhooks = appWebhooksData.webhooks.filter(wh => wh.id !== webhookId);

        // Update default if the deleted one was the default
        if (appWebhooksData.defaultWebhookId === webhookId) {
            if (appWebhooksData.webhooks.length > 0) {
                appWebhooksData.defaultWebhookId = appWebhooksData.webhooks[0].id; // Make the first one the new default
            } else {
                appWebhooksData.defaultWebhookId = null; // No webhooks left
            }
        }

        try {
            await new Promise((resolve, reject) => {
                chrome.storage.local.set({ webhooksData: appWebhooksData }, () => {
                    if (chrome.runtime.lastError) {
                        return reject(chrome.runtime.lastError);
                    }
                    resolve();
                });
            });
            showToast("Webhook deleted.");
        } catch (error) {
            showToast("Error deleting webhook. Please try again.", true);
            console.error("Failed to save webhook deletion:", error);
            // Rollback optimistic update
            appWebhooksData.webhooks = originalWebhooks;
            appWebhooksData.defaultWebhookId = originalDefaultId;
        }
        renderWebhookList();
        updateActiveWebhookDisplay(); // Update display after deletion
    }

    function renderWebhookList() {
        const listContainer = document.getElementById('webhookListContainer');
        if (!listContainer) {
            console.error("webhookListContainer not found in the DOM.");
            return;
        }
        listContainer.innerHTML = ''; // Clear previous list

        if (appWebhooksData && appWebhooksData.webhooks && appWebhooksData.webhooks.length > 0) {
            const ul = document.createElement('ul');
            ul.className = 'webhook-list'; // Add a class for potential styling

            appWebhooksData.webhooks.forEach(webhook => {
                const li = document.createElement('li');
                li.className = 'webhook-item'; // For styling individual items
                // Display the name and URL, and indication if it's default
                li.innerHTML = `
                    <div class="webhook-info">
                        <strong>${webhook.name}</strong>
                        ${webhook.id === appWebhooksData.defaultWebhookId ? '<span class="default-webhook-indicator">(Default)</span>' : ''}
                        <br>
                        <small class="webhook-url-display">${webhook.url}</small>
                    </div>
                    <div class="webhook-actions">
                        <button data-id="${webhook.id}" class="set-default-webhook-btn" title="Set as Default" ${webhook.id === appWebhooksData.defaultWebhookId ? "disabled" : ""}>Set Default</button>
                        <button data-id="${webhook.id}" class="delete-webhook-btn" title="Delete">Delete</button>
                    </div>
                `;
                // Note: Actual functionality for these buttons will be added in Phase 2
                // For now, they are just placeholders. The 'disabled' for Set Default is functional.
                ul.appendChild(li);
            });
            listContainer.appendChild(ul);
        } else {
            listContainer.textContent = 'No webhooks configured. Add one above!';
        }

        // Event delegation for webhook actions
        // Remove previous listener if it exists to avoid duplication
        if (listContainer._clickHandler) {
            listContainer.removeEventListener('click', listContainer._clickHandler);
        }
        // Define the new handler function
        listContainer._clickHandler = function(event) {
            const target = event.target;
            if (target.classList.contains('set-default-webhook-btn') && !target.disabled) {
                const webhookId = target.dataset.id;
                handleSetDefaultWebhook(webhookId); // Call the new set default handler
            } else if (target.classList.contains('delete-webhook-btn')) {
                const webhookId = target.dataset.id;
                handleDeleteWebhook(webhookId);
            }
        };
        // Attach the new handler
        listContainer.addEventListener('click', listContainer._clickHandler);
    }

    if (addWebhookButton && newWebhookNameInput && newWebhookUrlInput) {
        addWebhookButton.addEventListener('click', async () => {
            const name = newWebhookNameInput.value.trim();
            const url = newWebhookUrlInput.value.trim();

            if (!name || !url) {
                showToast("Webhook name and URL cannot be empty.", true);
                return;
            }

            try {
                new URL(url); // Basic URL validation
            } catch (e) {
                showToast("Invalid Webhook URL format.", true);
                return;
            }

            if (!appWebhooksData) {
                console.error("appWebhooksData is not initialized. Cannot add webhook.");
                showToast("Error: Webhook data not ready. Please try again.", true);
                return;
            }
            if (!appWebhooksData.webhooks) { // Defensive initialization
                appWebhooksData.webhooks = [];
            }

            const newWebhook = { id: generateUUID(), name: name, url: url };
            appWebhooksData.webhooks.push(newWebhook);

            if (!appWebhooksData.defaultWebhookId || appWebhooksData.webhooks.length === 1) {
                appWebhooksData.defaultWebhookId = newWebhook.id;
            }

            try {
                await new Promise(resolve => chrome.storage.local.set({ webhooksData: appWebhooksData }, resolve));
                renderWebhookList();
                newWebhookNameInput.value = '';
                newWebhookUrlInput.value = '';
                showToast('Webhook added successfully!');
            } catch (error) {
                console.error("Error saving webhook:", error);
                showToast('Failed to save webhook.', true);
                // Rollback optimistic update
                appWebhooksData.webhooks = appWebhooksData.webhooks.filter(wh => wh.id !== newWebhook.id);
                if (appWebhooksData.defaultWebhookId === newWebhook.id) {
                    appWebhooksData.defaultWebhookId = appWebhooksData.webhooks.length > 0 ? appWebhooksData.webhooks[0].id : null;
                }
                renderWebhookList(); // Re-render to reflect rollback
                updateActiveWebhookDisplay(); // Also update display on rollback
            }
        });
    } else {
        console.warn("Webhook management UI elements (add button or inputs) not found. Add functionality will not work.");
    }

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

    // Save local AI settings - REMOVED
    // saveLocalAISettings.addEventListener('click', () => { ... });
    
    // Function to show which local AI is active - REMOVED
    // function showLocalAIActiveToast(aiType, modelName) { ... }

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
            // 'openRouterApiKey', // Removed
            // 'openAIApiKey', // Removed
            // 'anthropicApiKey', // Removed
            // 'googleAIKey', // Removed
            // 'localAI', // Removed
            // 'webhookUrl', // Removed - Handled by initializeWebhooksData and new UI
            'theme'
        ], (result) => {
            // Set user name
            if (result.userName) {
                userNameInput.value = result.userName;
            }
            
            // Clear new webhook input fields when settings are opened
            if (typeof newWebhookNameInput !== 'undefined' && newWebhookNameInput) newWebhookNameInput.value = '';
            if (typeof newWebhookUrlInput !== 'undefined' && newWebhookUrlInput) newWebhookUrlInput.value = '';

            // Set Webhook URL - REMOVED (old input field)
            // if (result.webhookUrl) {
            //     webhookUrlInput.value = result.webhookUrl;
            // }
            
            // Set API keys (masked) - REMOVED
            // if (result.openRouterApiKey) { ... }
            // if (result.openAIApiKey) { ... }
            // if (result.anthropicApiKey) { ... }
            // if (result.googleAIKey) { ... }
            
            // Set local AI settings - REMOVED
            // if (result.localAI) { ... }
            
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

    // Display model information - REMOVED
    // function addModelInfoMessage(modelId, needsKey) { ... }

    updateSendButtonState();
    promptInput.focus();
    
    // Show initial model info when loading the extension - REMOVED
    // const initialModel = modelSelect.value;
    // const isInitialModelPaid = !initialModel.includes(':free');
    
    // chrome.storage.local.get(['openRouterApiKey'], (result) => {
    //     addModelInfoMessage(initialModel, isInitialModelPaid && !result.openRouterApiKey);
    // });

    // Save advanced API settings - REMOVED
    // const saveAdvancedSettingsButton = document.getElementById('saveAdvancedSettings');
    // const enableCachingToggle = document.getElementById('enableCachingToggle');
    // const enableMiddleOutToggle = document.getElementById('enableMiddleOutToggle');
    
    // if (saveAdvancedSettingsButton) { ... }
    
    // Load advanced API settings from storage - REMOVED
    // chrome.storage.local.get(['advancedApiSettings'], (result) => { ... });

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
    
    // Initialize storage on load (includes webhooks data now)
    (async () => {
        try {
            appWebhooksData = await initializeWebhooksData();
            console.log("Initialized appWebhooksData:", appWebhooksData);
            updateActiveWebhookDisplay(); // Initial call after data is loaded
        } catch (error) {
            console.error("Error initializing webhooksData:", error);
            appWebhooksData = { webhooks: [], defaultWebhookId: null }; // Fallback
            updateActiveWebhookDisplay(); // Also call in case of error to show appropriate message
        }

        // Initialize other storage dependent features like conversations
        // Ensure initializeStorage is defined before calling
        if (typeof initializeStorage === "function") {
            await initializeStorage();
        } else {
            console.error("initializeStorage function is not defined at the point of call in DOMContentLoaded setup.");
            // As a fallback for conversation loading if initializeStorage is missing or not yet defined:
            if (typeof loadOrCreateConversation === "function") {
                 console.warn("Attempting to load/create conversation without full initializeStorage sequence.");
                 await loadOrCreateConversation();
            }
        }
    })();
    
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
        try {
            // Try to load the last used conversation
            const savedConversationId = await new Promise(resolve => {
                chrome.storage.local.get(['lastConversationId'], (result) => {
                    resolve(result.lastConversationId || null);
                });
            });
            
            if (savedConversationId) {
                // If storage type is 'none' but we have a lastConversationId (e.g. from previous session before switching)
                // and it's not a supabase ID (which are typically UUIDs without 'local_')
                // we should treat it as a session-only ID for 'none' mode.
                if (storageSettings.type === 'none' && savedConversationId && !savedConversationId.startsWith('local_') && !savedConversationId.includes('-')) { // Basic check for non-supabase, non-legacy local
                    currentConversationId = savedConversationId;
                    clearChatHistory(); // Start fresh for session-only
                    console.log(`Continuing session-only conversation (no storage): ${currentConversationId}`);
                    return;
                } else if (storageSettings.type === 'none' && (!savedConversationId || savedConversationId.startsWith('local_'))) {
                    // If type is 'none' and no valid session ID, or it's a legacy local ID, create new.
                    const newId = await createNewConversation("New Conversation");
                    currentConversationId = newId; // createNewConversation now handles setting this for 'none'
                    return;
                }
                // For 'local' or 'supabase', attempt to load the conversation
                await loadConversation(savedConversationId);
            } else {
                // No saved ID, or storage type is 'none' and we need a new session ID
                const newId = await createNewConversation("New Conversation");
                currentConversationId = newId; // createNewConversation handles setting this for 'none'
                                             // For local/supabase, this ensures currentConversationId is set if loadConversation wasn't called.
            }
        } catch (error) {
            console.error("Error in loadOrCreateConversation:", error);
            // Fallback: try to create a new conversation to ensure app is usable
            try {
                const newId = await createNewConversation("New Conversation (Fallback)");
                currentConversationId = newId;
            } catch (fallbackError) {
                console.error("Fallback conversation creation failed:", fallbackError);
                currentConversationId = null; // Truly stuck
                clearChatHistory();
                addMessageToChat("Error initializing conversations. Please check settings or try restarting.", "ai-message error");
            }
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
                // const model = modelSelect.value; // Removed modelSelect
                const conversation = await supabaseClient.createConversation(title, null, null); // Pass null for model
                newId = conversation.id;
            } else if (storageSettings.type === 'local') {
                // Create in local storage
                newId = generateUUID(); // Use hyphenless UUID
                const newConversation = {
                    id: newId,
                    title: title,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    // model: modelSelect.value, // Removed modelSelect
                    model: null, // Set model to null
                    messages: []
                };
                
                await new Promise(resolve => {
                    chrome.storage.local.set({ [`conversation_${newId}`]: newConversation }, resolve);
                });
            } else { // No storage (storageSettings.type === 'none')
                newId = generateUUID(); // Generate a UUID for the session
                // currentConversationId is set outside this specific 'else' but before returning
                // chrome.storage.local.set({ lastConversationId: newId }); // Also set outside
                clearChatHistory(); // Clear UI for the new conversation
                // For 'none' mode, we still want to track currentConversationId for the session
            }
            
            // Set as current and save last used (applies to local and none storage types here)
            currentConversationId = newId;
            chrome.storage.local.set({ lastConversationId: newId });
            
            // Clear the chat for new conversation (if not already cleared for 'none')
            if (storageSettings.type !== 'none') {
                 clearChatHistory();
            }
            
            return newId;
        } catch (error) {
            console.error("Error creating conversation:", error);
            // In case of error, ensure we don't leave currentConversationId in an inconsistent state for 'none' mode
            if (storageSettings.type === 'none') {
                currentConversationId = generateUUID(); // Generate a new one for the session
                chrome.storage.local.set({ lastConversationId: currentConversationId });
                clearChatHistory();
                console.warn("Error during createNewConversation for 'none' mode, created a fallback session ID.");
                return currentConversationId; // Return the fallback ID
            }
            throw error; // Re-throw for supabase/local where error handling might be different
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

        // Ensure currentConversationId is set for the session
        if (!currentConversationId) {
            console.warn("currentConversationId was not set in handleSendMessage. Generating a new one for this session.");
            currentConversationId = generateUUID();
            chrome.storage.local.set({ lastConversationId: currentConversationId }, () => {
                console.log('Fallback sessionId saved to lastConversationId:', currentConversationId);
            });
            // We don't call clearChatHistory() here to avoid disrupting UI if user was typing
            // and expected continuity from a previous (but lost) session state.
            // loadOrCreateConversation should handle initializing the UI for a new ID if needed.
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

        // Get local AI settings to determine if we need an API key - REMOVED
        // const localAISettings = await new Promise(resolve => { ... });
        
        // const usingLocalAI = localAISettings.aiSource !== 'openrouter'; // REMOVED
        
        // Only check for OpenRouter API key if not using local AI - REMOVED
        // if (!usingLocalAI) { ... } else { ... }

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

            // Get API key (null is OK if using local AI) - REMOVED
            // const apiKey = await getApiKeyForModel(modelSelect.value);

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

            // When sending to API, use the full context window - REPLACED with webhook logic
            // const responseObj = await callOpenRouterAPI(...);

            // Retrieve the finalWebhookUrl to be used for the API call
            let finalWebhookUrl = null;
            let webhookUsedInfo = { id: null, name: null, isOverride: false };

            if (activeWebhookOverrideId) {
                const overrideWebhook = appWebhooksData.webhooks.find(wh => wh.id === activeWebhookOverrideId);
                if (overrideWebhook) {
                    finalWebhookUrl = overrideWebhook.url;
                    webhookUsedInfo = { id: overrideWebhook.id, name: overrideWebhook.name, isOverride: true };
                } else {
                    // Invalid override ID found, clear it and fall back to default.
                    // This also updates the display for future interactions.
                    console.warn("Invalid activeWebhookOverrideId found during send, clearing and using default.");
                    activeWebhookOverrideId = null;
                    updateActiveWebhookDisplay();
                }
            }

            // If no valid override, try to use the default webhook
            if (!finalWebhookUrl) {
                if (appWebhooksData && appWebhooksData.webhooks && appWebhooksData.webhooks.length > 0) {
                    const defaultWebhook = appWebhooksData.defaultWebhookId ?
                                           appWebhooksData.webhooks.find(wh => wh.id === appWebhooksData.defaultWebhookId) :
                                           null;
                    if (defaultWebhook) {
                        finalWebhookUrl = defaultWebhook.url;
                        webhookUsedInfo = { id: defaultWebhook.id, name: defaultWebhook.name, isOverride: false };
                    } else if (appWebhooksData.webhooks.length > 0) {
                        // No default is set, but webhooks exist. Fallback to the first one.
                        // updateActiveWebhookDisplay already shows a warning for this state.
                        finalWebhookUrl = appWebhooksData.webhooks[0].url;
                        webhookUsedInfo = { id: appWebhooksData.webhooks[0].id, name: appWebhooksData.webhooks[0].name, isOverride: false, isFallback: true };
                        console.warn("No default webhook set. Using the first available webhook as a fallback for this send operation.");
                    }
                }
            }

            if (!finalWebhookUrl) {
                addMessageToChat("No active webhook. Please configure or select a webhook in settings.", 'ai-message error');
                thinkingMessage?.parentNode?.removeChild(thinkingMessage);
                promptInput.disabled = false;
                updateSendButtonState();
                return;
            }

            const payload = {
                chatInput: combinedMessage,
                sessionId: currentConversationId,
                webhookUsed: webhookUsedInfo // For logging or debugging on the server
            };

            let responseObj = { content: '', reasoning: null };

            try {
                const response = await fetch(finalWebhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    let errorDetail = response.statusText; // Default error
                    try {
                        const errorData = await response.json(); // Try to parse as JSON first
                        if (typeof errorData === 'object' && errorData !== null) {
                            // Attempt to extract a more specific error message if available
                            errorDetail = errorData.message || errorData.error || JSON.stringify(errorData);
                        } else if (errorData) { // If it's not an object but truthy (e.g. a string from json())
                             errorDetail = errorData;
                        }
                    } catch (jsonError) {
                        // If JSON parsing fails, try to get plain text
                        try {
                            errorDetail = await response.text();
                        } catch (textError) {
                            // If text parsing also fails, stick with statusText
                             console.warn("Could not parse error response as JSON or text:", textError);
                        }
                    }
                    throw new Error(`Error: ${response.status} ${errorDetail}`);
                }

                const data = await response.json(); // Expecting JSON response now
                let llmMessage = null;
                responseObj.reasoning = null; // Reset reasoning

                if (Array.isArray(data)) {
                    if (data.length > 0) {
                        const firstElement = data[0];
                        if (firstElement && typeof firstElement === 'object' && firstElement.hasOwnProperty('output')) {
                            llmMessage = firstElement.output;
                            if (typeof llmMessage !== 'string') {
                                if (llmMessage === null || typeof llmMessage === 'undefined') {
                                     throw new Error("Invalid JSON response: 'output' field has null or undefined value.");
                                }
                                // Optionally, convert to string if other types are possible but need stringification
                                // llmMessage = String(llmMessage);
                            }
                        } else {
                            throw new Error("Invalid JSON response: First array element is missing 'output' field or is not an object.");
                        }
                    } else {
                        throw new Error("Invalid JSON response: Received an empty array.");
                    }
                } else {
                    throw new Error("Invalid JSON response: Expected a JSON array.");
                }

                if (llmMessage === null || typeof llmMessage === 'undefined') {
                    // This is a fallback, specific errors above are more informative
                    throw new Error("Failed to extract a valid message from the webhook response.");
                }
                responseObj.content = llmMessage;

            } catch (error) {
                 console.error("Webhook Error:", error);
                // Remove thinking message if it exists
                try {
                    thinkingMessage?.parentNode?.removeChild(thinkingMessage);
                } catch (e) {
                    console.warn("Could not remove thinking message:", e);
                }
                addMessageToChat(`Error: ${error.message}`, 'ai-message error');
                // Ensure UI is re-enabled in a finally block outside this try/catch
                throw error; // Re-throw to be caught by the outer finally
            }
            
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

    // Update callOpenRouterAPI to accept contextMessages instead of a single prompt - REMOVED
    // async function callOpenRouterAPI(apiKey, contextMessages, file, fileBase64, userName = null, hasExtractedContent = false) { ... }

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
        // If reasoning is present, add interactive display
        if (reasoning !== null || (typeof reasoningStream === 'function')) {
            const reasoningContainer = document.createElement('div');

            const toggleButton = document.createElement('span');
            toggleButton.className = 'reasoning-toggle-button';
            toggleButton.textContent = 'reasoning';

            const reasoningContent = document.createElement('div');
            reasoningContent.className = 'reasoning-content markdown-body'; // Added markdown-body for styling
            reasoningContent.classList.add('shimmering'); // Always add shimmer for real-time effect

            toggleButton.addEventListener('click', () => {
                const isOpen = reasoningContent.classList.contains('open');
                if (isOpen) {
                    reasoningContent.classList.remove('open');
                    toggleButton.textContent = 'reasoning';
                } else {
                    toggleButton.textContent = 'hide reasoning';
                    reasoningContent.classList.add('open');
                }
            });

            reasoningContainer.appendChild(toggleButton);
            reasoningContainer.appendChild(reasoningContent);
            messageDiv.appendChild(reasoningContainer);
            
            // Initialize with content if available immediately
            if (reasoning !== null) {
                reasoningContent.innerHTML = renderMarkdown(reasoning);
            }
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

    // 1. Load and populate model dropdown with search - REMOVED
    // async function populateModelDropdown(filter = '') { ... }

    // Call on DOMContentLoaded - REMOVED
    // populateModelDropdown();

    // 2. Add model search/filtering - REMOVED
    // const modelSearchInput = document.getElementById('modelSearchInput');
    // if (modelSearchInput) { ... }

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

    // 2. Use GoogleAI key for Google models, fallback to OpenRouter key - REMOVED
    // async function getApiKeyForModel(modelId) { ... }

    // 4. After first user/AI message, update conversation title with AI-generated title (only once) - REMOVED
    // let aiTitleGenerated = false; // REMOVED
    // async function updateConversationTitleWithAI(message) { ... }
    // In handleSendMessage, after first user/AI message: - REMOVED
    // if (!aiTitleGenerated && promptText) { ... }
});