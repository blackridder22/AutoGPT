// Allows users to open the side panel by clicking the action toolbar icon
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// Create context menu items when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  // Create a parent context menu item
  chrome.contextMenus.create({
    id: 'ai-assistant',
    title: 'Auto GPT',
    contexts: ['selection', 'image']
  });

  // Add analyze selection option
  chrome.contextMenus.create({
    id: 'analyze-selection',
    parentId: 'ai-assistant',
    title: 'Analyze selected text',
    contexts: ['selection']
  });

  // Add analyze image option
  chrome.contextMenus.create({
    id: 'analyze-image',
    parentId: 'ai-assistant',
    title: 'Analyze image',
    contexts: ['image']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  // Open the side panel
  await chrome.sidePanel.open({tabId: tab.id});
  
  // Send a message to the side panel with the selected data
  if (info.menuItemId === 'analyze-selection' && info.selectionText) {
    chrome.runtime.sendMessage({
      action: 'analyze-text',
      text: info.selectionText
    });
  } else if (info.menuItemId === 'analyze-image' && info.srcUrl) {
    chrome.runtime.sendMessage({
      action: 'analyze-image',
      imageUrl: info.srcUrl
    });
  }
});

// You can also add logic here to open the panel programmatically on specific sites
// or under certain conditions if needed in the future.
// For example:
// chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
//   if (!tab.url) return;
//   const url = new URL(tab.url);
//   // Enables the side panel on google.com
//   if (url.origin === 'https://www.google.com') {
//     await chrome.sidePanel.setOptions({
//       tabId,
//       path: 'sidepanel.html',
//       enabled: true
//     });
//   } else {
//     // Disables the side panel on other sites
//     await chrome.sidePanel.setOptions({
//       tabId,
//       enabled: false
//     });
//   }
// });