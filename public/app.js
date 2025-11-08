// Format field name by splitting on common delimiters and capitalizing
function formatFieldName(key) {
    // Split by common delimiters: underscore, hyphen, dot
    const parts = key.split(/[_\-.]+/);
    
    // Capitalize first letter of each word and join with spaces
    return parts
        .map(part => {
            if (!part) return '';
            return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
        })
        .filter(part => part.length > 0)
        .join(' ');
}

// Extract emoji from text (if present)
function extractEmoji(text) {
    if (!text) return null;
    
    // Unicode emoji ranges - matches most common emojis
    // This regex matches emoji characters including:
    // - Emoticons (😀-🙏)
    // - Miscellaneous Symbols (☀-⛿)
    // - Dingbats (✀-➿)
    // - Supplemental Symbols (🀀-🃿)
    // - Miscellaneous Technical (⌀-⏿) - includes ⏰
    // - And many more emoji ranges
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2300}-\u{23FF}]|[\u{200D}]|[\u{FE0F}]/gu;
    const match = text.match(emojiRegex);
    
    // Return first emoji found, or null if none
    return match && match.length > 0 ? match[0] : null;
}

// Remove emoji from text
function removeEmoji(text) {
    if (!text) return text;
    
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2300}-\u{23FF}]|[\u{200D}]|[\u{FE0F}]/gu;
    return text.replace(emojiRegex, '').trim();
}

// Convert URLs in text to clickable links
function convertUrlsToLinks(text) {
    if (!text) return '';
    
    // URL regex pattern - matches http, https, ftp, and www URLs
    const urlPattern = /(https?:\/\/[^\s]+|www\.[^\s]+|ftp:\/\/[^\s]+)/gi;
    
    // Escape HTML to prevent XSS, then convert URLs to links
    const escapedText = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    
    return escapedText.replace(urlPattern, (url) => {
        // Ensure URL has protocol
        let href = url;
        if (url.startsWith('www.')) {
            href = 'https://' + url;
        }
        
        return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="helper-link">${url}</a>`;
    });
}

// Icon mappings for different sections
const iconMap = {
    'Server': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V8h16v10zm0-12H4V6h16v0z"/></svg>`,
    'Storage': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/><path d="M12 6v6l4 2"/></svg>`,
    'Tokens': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/><path d="M12 6v6l4 2"/></svg>`,
    'Summarizer': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>`,
    'Workflow': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>`,
    'General': `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94L14.4 2.81c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>`
};

class SettingsApp {
    constructor() {
        this.settings = {};
        this.sectionOrder = [];
        this.originalSettings = {};
        this.currentTab = null;
        this.hasChanges = false;
        this.searchQuery = '';
        this.systems = [];
        this.systemSettings = null; // System Settings stored separately
        this.currentMainTab = 'system-settings'; // 'system-settings' or 'systems'
        this.currentSystemName = null;
        this.currentSystem = null; // Store current system object for path display
        this.editingSystemName = null;
        this.rawMode = false;
        this.rawContent = '';
        this.originalRawContent = '';
        this.customCssUrl = null;
        
        this.init();
    }

    async init() {
        this.initTheme();
        this.setupEventListeners();
        // Load systems first, then settings (which will auto-select first system if needed)
        await this.loadSystems();
        // Initialize main tabs
        this.renderMainTabs();
        // Auto-select System Settings on startup
        if (this.systemSettings) {
            this.currentMainTab = 'system-settings';
            this.currentSystemName = 'System Settings';
            this.currentSystem = this.systemSettings;
            this.updateConfigPathDisplay();
            await this.loadSettings();
        } else if (this.systems.length > 0) {
            // If no System Settings, switch to Systems tab and select first system
            this.currentMainTab = 'systems';
            this.currentSystemName = this.systems[0].name;
            this.currentSystem = this.systems[0];
            this.updateConfigPathDisplay();
            await this.loadSettings();
        }
        
        // Setup WebSocket connection for real-time file change notifications
        this.setupWebSocket();
        
        // Reload settings when page becomes visible again (user switches back to tab)
        // This ensures we always show the most recent configuration from file
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.currentSystemName) {
                // Page became visible - reload fresh settings from file
                this.loadSettings();
            }
        });
    }

    setupWebSocket() {
        // Determine WebSocket URL based on current page location
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;
        
        try {
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                console.log('WebSocket connected - receiving real-time file change notifications');
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    
                    if (message.type === 'connected') {
                        console.log('WebSocket:', message.message);
                        return;
                    }
                    
                    if (message.type === 'file-changed') {
                        // File changed - reload if it's the current system
                        // WebSocket message uses systemName (or systemId for backward compatibility)
                        const messageSystemName = message.systemName || message.systemId;
                        if (messageSystemName === this.currentSystemName) {
                            console.log('Config file changed - reloading settings...');
                            this.showSuccess('Configuration file was updated. Reloading...');
                            // Reload settings from file
                            this.loadSettings();
                        } else {
                            // Another system's file changed - just show notification
                            const system = this.systems.find(s => s.name === messageSystemName);
                            if (system) {
                                console.log(`Config file changed for ${system.name}`);
                            }
                        }
                    } else if (message.type === 'registry-changed') {
                        // Registry changed - reload systems list
                        console.log('Systems registry changed - reloading systems...');
                        this.loadSystems();
                    }
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };
            
            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
            
            this.ws.onclose = () => {
                console.log('WebSocket disconnected. Attempting to reconnect...');
                // Attempt to reconnect after 3 seconds
                setTimeout(() => {
                    if (this.ws.readyState === WebSocket.CLOSED) {
                        this.setupWebSocket();
                    }
                }, 3000);
            };
        } catch (error) {
            console.error('Failed to setup WebSocket:', error);
        }
    }

    initTheme() {
        // Theme names mapping
        this.themeNames = {
            'default': 'Light (Default)',
            'cyberpunk': 'Cyberpunk',
            'vscode-dark': 'VS Code Dark',
            'vscode-light': 'VS Code Light',
            'chatgpt': 'ChatGPT',
            'dracula': 'Dracula',
            'nord': 'Nord',
            'monokai': 'Monokai',
            'custom': 'Custom CSS'
        };
        
        // Initialize default theme (will be loaded from server)
        this.defaultTheme = 'cyberpunk';
        
        // Load saved custom CSS URL if exists
        const savedCustomCssUrl = localStorage.getItem('configStudioCustomCssUrl');
        if (savedCustomCssUrl) {
            this.customCssUrl = savedCustomCssUrl;
            this.loadCustomCss(savedCustomCssUrl);
        }
        
        // Load default theme from server config (.env.config-studio), then apply it
        this.loadDefaultTheme().then(() => {
            // Use theme from .env.config-studio file (not from localStorage)
            // This ensures the configured theme is always used on startup
            // Map 'light' to 'default' for theme system
            let themeFromConfig = this.defaultTheme;
            if (themeFromConfig === 'light') {
                themeFromConfig = 'default';
            }
            this.setTheme(themeFromConfig);
            
            // If custom theme was configured, load the URL into the input
            if (themeFromConfig === 'custom' && savedCustomCssUrl) {
                const customCssInput = document.getElementById('customCssUrlInput');
                if (customCssInput) {
                    customCssInput.value = savedCustomCssUrl;
                }
            }
        });
    }
    
    async loadDefaultTheme() {
        try {
            const response = await fetch('/api/config');
            if (response.ok) {
                const config = await response.json();
                if (config.defaultTheme) {
                    this.defaultTheme = config.defaultTheme;
                }
            }
        } catch (error) {
            console.warn('Failed to load config from server, using fallback default theme:', error);
            // Use fallback default
            this.defaultTheme = 'cyberpunk';
        }
    }
    
    loadCustomCss(url) {
        // Remove existing custom CSS link if any
        const existingLink = document.getElementById('customThemeCss');
        if (existingLink) {
            existingLink.remove();
        }
        
        // Create new link element
        const link = document.createElement('link');
        link.id = 'customThemeCss';
        link.rel = 'stylesheet';
        link.href = url;
        
        // Handle load success
        link.onload = () => {
            console.log('Custom CSS loaded successfully:', url);
        };
        
        // Handle load error
        link.onerror = () => {
            console.error('Failed to load custom CSS:', url);
            this.showError('Failed to load custom CSS file. Please check the URL and ensure the file is accessible.');
        };
        
        // Add to head
        document.head.appendChild(link);
    }

    setTheme(themeName) {
        // Remove all theme attributes
        document.documentElement.removeAttribute('data-theme');
        
        // Set new theme (only if not default)
        if (themeName && themeName !== 'default') {
            document.documentElement.setAttribute('data-theme', themeName);
        }
        
        // Save to localStorage (save as themeName, not mapped value)
        localStorage.setItem('configStudioTheme', themeName);
    }
    
    openCustomThemeModal() {
        const modal = document.getElementById('customThemeModal');
        if (modal) {
            modal.classList.add('active');
            // Load saved URL if exists
            const customCssInput = document.getElementById('customCssUrlInput');
            if (customCssInput && this.customCssUrl) {
                customCssInput.value = this.customCssUrl;
            }
        }
    }
    
    closeCustomThemeModal() {
        const modal = document.getElementById('customThemeModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }
    
    saveCustomTheme() {
        const customCssInput = document.getElementById('customCssUrlInput');
        if (!customCssInput) return;
        
        const cssUrl = customCssInput.value.trim();
        
        if (!cssUrl) {
            this.showError('Please enter a CSS file URL.');
            return;
        }
        
        // Validate URL format (basic check)
        try {
            // Try to create a URL object to validate
            new URL(cssUrl, window.location.origin);
        } catch (e) {
            // If it's a relative path, that's okay
            if (!cssUrl.startsWith('/') && !cssUrl.startsWith('./') && !cssUrl.startsWith('../')) {
                this.showError('Please enter a valid URL or relative path.');
                return;
            }
        }
        
        // Save custom CSS URL
        this.customCssUrl = cssUrl;
        localStorage.setItem('configStudioCustomCssUrl', cssUrl);
        
        // Load the CSS file
        this.loadCustomCss(cssUrl);
        
        // Apply custom theme
        this.setTheme('custom');
        
        // Close modal
        this.closeCustomThemeModal();
        
        // Show success message
        this.showSuccess('Custom theme loaded successfully!');
    }

    setupEventListeners() {
        document.getElementById('closeBtn').addEventListener('click', () => {
            window.close();
        });
        
        // Theme selector
        
        // Custom theme modal
        const customThemeModal = document.getElementById('customThemeModal');
        const customThemeModalCloseBtn = document.getElementById('customThemeModalCloseBtn');
        const cancelCustomThemeBtn = document.getElementById('cancelCustomThemeBtn');
        const saveCustomThemeBtn = document.getElementById('saveCustomThemeBtn');
        
        if (customThemeModalCloseBtn) {
            customThemeModalCloseBtn.addEventListener('click', () => {
                this.closeCustomThemeModal();
            });
        }
        
        if (cancelCustomThemeBtn) {
            cancelCustomThemeBtn.addEventListener('click', () => {
                this.closeCustomThemeModal();
            });
        }
        
        if (saveCustomThemeBtn) {
            saveCustomThemeBtn.addEventListener('click', () => {
                this.saveCustomTheme();
            });
        }
        
        // Close modal on background click
        if (customThemeModal) {
            customThemeModal.addEventListener('click', (e) => {
                if (e.target.id === 'customThemeModal') {
                    this.closeCustomThemeModal();
                }
            });
        }

        document.getElementById('cancelBtn').addEventListener('click', () => {
            if (this.hasChanges) {
                this.resetChanges();
            }
        });

        document.getElementById('saveBtn').addEventListener('click', () => {
            this.saveSettings();
        });

        // Main tab switching
        document.querySelectorAll('.main-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const mainTab = tab.dataset.mainTab;
                this.switchMainTab(mainTab);
            });
        });

        // System management modal

        document.getElementById('modalCloseBtn').addEventListener('click', () => {
            this.closeSystemModal();
        });

        document.getElementById('addSystemBtn').addEventListener('click', () => {
            this.showSystemForm();
        });

        document.getElementById('cancelFormBtn').addEventListener('click', () => {
            this.hideSystemForm();
        });

        document.getElementById('saveSystemBtn').addEventListener('click', () => {
            this.saveSystem();
        });

        // Close modal on background click
        document.getElementById('systemModal').addEventListener('click', (e) => {
            if (e.target.id === 'systemModal') {
                this.closeSystemModal();
            }
        });

        // Real-time search
        const searchInput = document.getElementById('searchInput');
        searchInput.addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase().trim();
            this.performSearch();
        });
        
        // Reload settings when page becomes visible (in case .env was changed externally)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && !this.hasChanges) {
                // Only reload if there are no unsaved changes
                this.loadSettings();
            }
        });
        
        // Reload on focus (when user switches back to the tab)
        window.addEventListener('focus', () => {
            if (!this.hasChanges) {
                this.loadSettings();
            }
        });
    }

    async loadSystems() {
        try {
            const response = await fetch('/api/systems');
            if (!response.ok) throw new Error('Failed to load systems');
            const allSystems = await response.json();
            
            // Separate System Settings from other systems
            this.systemSettings = allSystems.find(s => s.name === 'System Settings') || null;
            this.systems = allSystems.filter(s => s.name !== 'System Settings');
            
            // Update current system if it's still selected
            if (this.currentSystemName) {
                if (this.currentSystemName === 'System Settings') {
                    this.currentSystem = this.systemSettings;
                } else {
                    this.currentSystem = this.systems.find(s => s.name === this.currentSystemName);
                }
                this.updateConfigPathDisplay();
            }
            
            this.renderMainTabs();
            this.renderSystemSubTabs();
            
            // If on systems tab and no systems, show empty state
            if (this.currentMainTab === 'systems' && this.systems.length === 0) {
                this.showEmptySystemsState();
            }
        } catch (error) {
            console.error('Error loading systems:', error);
            this.systems = [];
            this.systemSettings = null;
            this.currentSystem = null;
            this.renderMainTabs();
            this.renderSystemSubTabs();
            this.updateConfigPathDisplay();
            
            // If on systems tab and no systems, show empty state
            if (this.currentMainTab === 'systems' && this.systems.length === 0) {
                this.showEmptySystemsState();
            }
        }
    }

    /**
     * Update the config file path display
     */
    updateConfigPathDisplay() {
        const pathDisplay = document.getElementById('configPathDisplay');
        if (!pathDisplay) return;
        
        if (this.currentSystem && this.currentSystem.configPath) {
            pathDisplay.innerHTML = `
                <div class="config-path-content">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" class="config-path-icon">
                        <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z"/>
                    </svg>
                    <span class="config-path-label">Config File:</span>
                    <span class="config-path-value" title="${this.escapeHtml(this.currentSystem.configPath)}">${this.escapeHtml(this.currentSystem.configPath)}</span>
                </div>
            `;
            pathDisplay.style.display = 'block';
        } else {
            pathDisplay.style.display = 'none';
        }
    }

    renderMainTabs() {
        const mainTabs = document.querySelectorAll('.main-tab');
        mainTabs.forEach(tab => {
            if (tab.dataset.mainTab === this.currentMainTab) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
        
        // Show/hide system sub-tabs container based on active main tab
        const systemTabsContainer = document.getElementById('systemTabsContainer');
        if (this.currentMainTab === 'systems') {
            systemTabsContainer.style.display = 'block';
        } else {
            systemTabsContainer.style.display = 'none';
        }
    }
    
    renderSystemSubTabs() {
        const tabsContainer = document.getElementById('systemTabs');
        tabsContainer.innerHTML = '';
        
        // Add all registered systems as sub-tabs
        this.systems.forEach(system => {
            const tab = document.createElement('div');
            tab.className = 'system-tab';
            tab.dataset.systemName = system.name;
            
            if (system.name === this.currentSystemName && this.currentMainTab === 'systems') {
                tab.classList.add('active');
            }
            
            tab.innerHTML = `
                <span class="system-tab-name">${this.escapeHtml(system.name)}</span>
                <button class="system-tab-delete" title="Delete system" data-system-name="${this.escapeHtml(system.name)}">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                </button>
            `;
            
            // Handle delete button click
            const deleteBtn = tab.querySelector('.system-tab-delete');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent tab switch
                this.deleteSystem(system.name);
            });
            
            // Handle tab click (switch system)
            tab.addEventListener('click', (e) => {
                // Don't switch if clicking the delete button
                if (e.target.closest('.system-tab-delete')) {
                    return;
                }
                
                if (system.name !== this.currentSystemName) {
                    // Check for unsaved changes
                    if (this.hasChanges) {
                        if (!confirm('You have unsaved changes. Switch system anyway?')) {
                            return;
                        }
                    }
                    
                    // Completely reset state before switching
                    this.resetStateForSystemSwitch();
                    
                    this.currentMainTab = 'systems';
                    this.currentSystemName = system.name;
                    this.currentSystem = system;
                    this.updateConfigPathDisplay();
                    this.renderMainTabs();
                    this.renderSystemSubTabs();
                    this.loadSettings();
                }
            });
            
            tabsContainer.appendChild(tab);
        });
        
        // Add [+] tab for adding new systems
        const addTab = document.createElement('div');
        addTab.className = 'system-tab system-tab-add';
        addTab.innerHTML = `
            <span class="system-tab-name">
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                <span>Add System</span>
            </span>
        `;
        
        addTab.addEventListener('click', () => {
            this.openSystemModal();
        });
        
        tabsContainer.appendChild(addTab);
    }
    
    switchMainTab(mainTab) {
        if (mainTab === this.currentMainTab) {
            return; // Already on this tab
        }
        
        // Check for unsaved changes
        if (this.hasChanges) {
            if (!confirm('You have unsaved changes. Switch tab anyway?')) {
                return;
            }
        }
        
        this.currentMainTab = mainTab;
        
        if (mainTab === 'system-settings') {
            // Switch to System Settings
            if (this.systemSettings) {
                this.resetStateForSystemSwitch();
                this.currentSystemName = 'System Settings';
                this.currentSystem = this.systemSettings;
                this.updateConfigPathDisplay();
                this.renderMainTabs();
                this.loadSettings();
            } else {
                this.showError('System Settings not found. Please ensure the default .env file is registered.');
                return;
            }
        } else if (mainTab === 'systems') {
            // Switch to Systems tab
            this.renderMainTabs();
            this.renderSystemSubTabs();
            
            // If no systems registered, show empty state
            if (this.systems.length === 0) {
                this.resetStateForSystemSwitch();
                this.currentSystemName = null;
                this.currentSystem = null;
                this.updateConfigPathDisplay();
                this.showEmptySystemsState();
                return;
            }
            
            // If no system selected, select the first one
            if (!this.currentSystemName || this.currentSystemName === 'System Settings') {
                if (this.systems.length > 0) {
                    this.resetStateForSystemSwitch();
                    this.currentSystemName = this.systems[0].name;
                    this.currentSystem = this.systems[0];
                    this.updateConfigPathDisplay();
                    this.renderSystemSubTabs();
                    this.loadSettings();
                }
            } else {
                // Just update the UI to show the selected system
                this.renderSystemSubTabs();
            }
        }
    }

    /**
     * Show empty state when no systems are registered
     */
    showEmptySystemsState() {
        const tabContent = document.getElementById('tabContent');
        if (!tabContent) return;
        
        // Clear any existing content
        tabContent.innerHTML = '';
        
        // Get default config file from server or use .env
        const defaultConfigFile = '.env'; // Could be fetched from server config if needed
        
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.innerHTML = `
            <div class="empty-state-content">
                <h3>No Systems Registered</h3>
                <p>No configuration systems are currently registered.</p>
                <p>Config Studio will automatically register <code>${defaultConfigFile}</code> if it exists in the current folder.</p>
                <p>You can also manually register systems by clicking the <strong>"Add System"</strong> tab above.</p>
            </div>
        `;
        tabContent.appendChild(emptyState);
        
        // Hide action buttons when showing empty state
        const actionButtons = document.querySelector('.action-buttons');
        if (actionButtons) {
            actionButtons.style.display = 'none';
        }
    }

    /**
     * Reset all state when switching systems to ensure complete isolation
     */
    resetStateForSystemSwitch() {
        // Clear all settings data
        this.settings = {};
        this.sectionOrder = [];
        this.originalSettings = {};
        
        // Reset UI state
        this.currentTab = null;
        this.hasChanges = false;
        this.searchQuery = '';
        
        // Reset raw mode state
        this.rawMode = false;
        this.rawContent = '';
        this.originalRawContent = '';
        
        // Clear the UI immediately to show loading state
        const tabContent = document.getElementById('tabContent');
        const navMenu = document.getElementById('navMenu');
        if (tabContent) {
            tabContent.innerHTML = '<div class="loading">Loading settings...</div>';
        }
        if (navMenu) {
            navMenu.innerHTML = '';
        }
    }

    async loadSettings() {
        try {
            // Require a system to be selected
            if (!this.currentSystemName) {
                // If no system selected but systems exist, select the first one
                if (this.systems.length > 0) {
                    this.currentSystemName = this.systems[0].name;
                    this.currentSystem = this.systems[0];
                    this.updateConfigPathDisplay();
                    this.renderMainTabs();
                    this.renderSystemSubTabs();
                } else {
                    // No systems registered yet
                    this.settings = {};
                    this.sectionOrder = [];
                    this.originalSettings = {};
                    this.render();
                    return;
                }
            }
            
            // Build URL with system parameter (always required now)
            // Always use timestamp to ensure we get fresh data from file (no browser cache)
            const url = `/api/settings?t=${Date.now()}&system=${encodeURIComponent(this.currentSystemName)}`;
            
            // Always fetch fresh data from file - no caching
            // The server always reads from file system, and we prevent browser caching
            const response = await fetch(url, {
                cache: 'no-store', // Don't store in cache
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });
            
            if (!response.ok) {
                // Try to get error message from response
                let errorMessage = 'Failed to load settings';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorMessage;
                } catch (e) {
                    // If response is not JSON, use status text
                    errorMessage = response.statusText || errorMessage;
                }
                throw new Error(errorMessage);
            }
            
            const data = await response.json();
            
            // Check if this is raw mode (unsupported format)
            if (data.raw === true) {
                this.rawMode = true;
                this.rawContent = data.content || '';
                this.originalRawContent = this.rawContent;
                this.settings = {};
                this.sectionOrder = [];
                this.originalSettings = {};
                this.currentTab = null; // Reset tab when switching to raw mode
                this.hasChanges = false;
                this.render();
                return;
            }
            
            // Handle structured format
            this.rawMode = false;
            // Reset current tab when loading new system
            this.currentTab = null;
            // Handle both old format (just sections) and new format (sections + sectionOrder)
            this.settings = data.sections || data;
            this.sectionOrder = data.sectionOrder || Object.keys(this.settings).sort();
            this.originalSettings = JSON.parse(JSON.stringify(this.settings));
            this.hasChanges = false; // Reset changes flag when loading new system
            this.render();
        } catch (error) {
            console.error('Error loading settings:', error);
            // Check if it's a network error or API error
            if (error.message && error.message.includes('Failed to load settings')) {
                // Try to get more details from the response if available
                this.showError('Failed to load settings. The config file may not exist or may be inaccessible.');
            } else {
                this.showError(`Failed to load settings: ${error.message || 'Unknown error'}`);
            }
            // Show empty state instead of error if file doesn't exist
            this.settings = {};
            this.sectionOrder = [];
            this.originalSettings = {};
            this.render();
        }
    }

    render() {
        // Always clear and rebuild - ensure no state leakage
        this.renderNav();
        this.renderContent();
        
        // Show message if no settings available
        if (Object.keys(this.settings).length === 0 && this.currentSystemName && !this.rawMode) {
            const tabContent = document.getElementById('tabContent');
            // Remove any existing content first
            const existingEmptyState = tabContent.querySelector('.empty-state');
            if (existingEmptyState) {
                existingEmptyState.remove();
            }
            const existingRawEditor = tabContent.querySelector('.raw-editor-container');
            if (existingRawEditor) {
                existingRawEditor.remove();
            }
            
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.innerHTML = `
                <div class="empty-state-content">
                    <h3>No Configuration Settings</h3>
                    <p>The config file exists but contains no settings, or the file is empty.</p>
                    <p>You can add settings by editing the config file directly, or wait for settings to be added.</p>
                </div>
            `;
            tabContent.appendChild(emptyState);
        }
        
        // Activate first tab if none is active (considering search filter)
        // Only do this for structured mode (not raw mode)
        if (!this.rawMode && !this.currentTab && this.sectionOrder.length > 0) {
            const firstVisibleTab = this.searchQuery 
                ? this.sectionOrder.find(sectionName => this.sectionMatchesSearch(sectionName))
                : this.sectionOrder[0];
            if (firstVisibleTab) {
                this.switchTab(firstVisibleTab);
            }
        }
    }

    renderNav() {
        const navMenu = document.getElementById('navMenu');
        if (!navMenu) return;
        
        // Completely clear navigation - ensure no state leakage
        navMenu.innerHTML = '';
        
        // Don't render nav in raw mode
        if (this.rawMode) {
            return;
        }

        // Use sectionOrder to preserve order from .env file
        this.sectionOrder.forEach(sectionName => {
            const navItem = document.createElement('div');
            navItem.className = 'nav-item';
            navItem.dataset.sectionName = sectionName;
            if (this.currentTab === sectionName) {
                navItem.classList.add('active');
            }
            
            // Show section name as-is (including emoji if present in comment)
            navItem.innerHTML = `
                <span>${this.highlightSearch(sectionName)}</span>
            `;
            
            navItem.addEventListener('click', () => this.switchTab(sectionName));
            navMenu.appendChild(navItem);
        });
        
        // Apply search filter
        this.applySearchFilter();
    }

    renderContent() {
        const tabContent = document.getElementById('tabContent');
        if (!tabContent) return;
        
        // Completely clear all content first - ensure no state leakage
        tabContent.innerHTML = '';

        // Render raw mode for unsupported formats
        if (this.rawMode) {
            const rawEditor = document.createElement('div');
            rawEditor.className = 'raw-editor-container';
            rawEditor.innerHTML = `
                <div class="raw-editor-header">
                    <h3>Raw File Editor</h3>
                    <p class="raw-editor-info">This configuration file format is not yet supported for structured editing. You can edit the file content directly below.</p>
                </div>
                <textarea id="rawContentTextarea" class="raw-content-textarea" spellcheck="false">${this.escapeHtml(this.rawContent)}</textarea>
            `;
            tabContent.appendChild(rawEditor);
            
            // Add event listener for textarea changes
            const textarea = document.getElementById('rawContentTextarea');
            textarea.addEventListener('input', () => {
                this.rawContent = textarea.value;
                this.hasChanges = (this.rawContent !== this.originalRawContent);
                this.updateSaveButton();
            });
            return;
        }

        if (Object.keys(this.settings).length === 0) {
            // Don't show error if we have a system selected - it might just be empty
            if (this.currentSystemName) {
                const emptyState = document.createElement('div');
                emptyState.className = 'empty-state';
                emptyState.innerHTML = `
                    <div class="empty-state-content">
                        <h3>No Configuration Settings</h3>
                        <p>The config file exists but contains no settings, or the file is empty.</p>
                        <p>You can add settings by editing the config file directly.</p>
                    </div>
                `;
                tabContent.appendChild(emptyState);
            } else {
                tabContent.innerHTML = '<div class="loading">No settings found. Please select a system or create a config file.</div>';
            }
            return;
        }

        // Use sectionOrder to preserve order from .env file
        this.sectionOrder.forEach(sectionName => {
            const tabPane = document.createElement('div');
            tabPane.className = 'tab-pane';
            tabPane.id = `tab-${sectionName}`;
            if (this.currentTab === sectionName) {
                tabPane.classList.add('active');
            }

            const sectionTitle = document.createElement('h2');
            sectionTitle.className = 'section-title';
            // Show section name as-is (exactly as it appears in .env comment)
            sectionTitle.textContent = sectionName;
            tabPane.appendChild(sectionTitle);

            this.settings[sectionName].forEach(item => {
                const formGroup = document.createElement('div');
                formGroup.className = 'form-group';

                const label = document.createElement('label');
                label.className = 'form-label';
                // Split by common delimiters (_, -, .) and format as title case
                label.innerHTML = this.highlightSearch(formatFieldName(item.key));
                formGroup.appendChild(label);
                
                // Store searchable data attributes
                formGroup.dataset.fieldKey = item.key.toLowerCase();
                formGroup.dataset.fieldName = formatFieldName(item.key).toLowerCase();

                // Special handling for CONFIG_STUDIO_THEME - render as select dropdown
                if (item.key === 'CONFIG_STUDIO_THEME') {
                    const select = document.createElement('select');
                    select.className = 'form-input form-select';
                    select.dataset.section = sectionName;
                    select.dataset.key = item.key;
                    
                    // Theme options - map 'light' to 'default' for theme system
                    const themes = [
                        { value: 'light', label: 'Light (Default)', themeValue: 'default' },
                        { value: 'cyberpunk', label: 'Cyberpunk', themeValue: 'cyberpunk' },
                        { value: 'vscode-dark', label: 'VS Code Dark', themeValue: 'vscode-dark' },
                        { value: 'vscode-light', label: 'VS Code Light', themeValue: 'vscode-light' },
                        { value: 'chatgpt', label: 'ChatGPT', themeValue: 'chatgpt' },
                        { value: 'dracula', label: 'Dracula', themeValue: 'dracula' },
                        { value: 'nord', label: 'Nord', themeValue: 'nord' },
                        { value: 'monokai', label: 'Monokai', themeValue: 'monokai' },
                        { value: 'custom', label: 'Custom CSS', themeValue: 'custom' }
                    ];
                    
                    // Map config value to select value (handle 'default' -> 'light')
                    const currentValue = item.value === 'default' ? 'light' : item.value;
                    
                    themes.forEach(theme => {
                        const option = document.createElement('option');
                        option.value = theme.value;
                        option.textContent = theme.label;
                        if (currentValue === theme.value) {
                            option.selected = true;
                        }
                        select.appendChild(option);
                    });
                    
                    select.addEventListener('change', (e) => {
                        const newValue = e.target.value;
                        const selectedTheme = themes.find(t => t.value === newValue);
                        const themeValue = selectedTheme ? selectedTheme.themeValue : newValue;
                        
                        // Update settings object (save as 'light' not 'default')
                        item.value = newValue;
                        // Mark as modified
                        select.classList.add('modified');
                        this.hasChanges = true;
                        this.updateSaveButton();
                        
                        // Apply theme immediately (use themeValue for theme system)
                        if (themeValue === 'custom') {
                            // Open custom theme modal if custom is selected
                            this.openCustomThemeModal();
                        } else {
                            this.setTheme(themeValue);
                        }
                        
                        // Also update the input change handler for consistency
                        this.handleInputChange(e.target);
                    });
                    
                    formGroup.appendChild(select);
                } else {
                    const input = document.createElement('input');
                    
                    // Apply rules to input
                    if (item.rules) {
                        if (item.rules.type === 'number') {
                            input.type = 'number';
                            if (item.rules.min !== undefined) {
                                input.min = item.rules.min;
                            }
                            if (item.rules.max !== undefined) {
                                input.max = item.rules.max;
                            }
                        } else if (item.rules.type === 'url') {
                            input.type = 'url';
                        } else if (item.rules.type === 'email') {
                            input.type = 'email';
                        } else {
                            input.type = 'text';
                        }
                        
                        if (item.rules.required) {
                            input.required = true;
                        }
                        
                        if (item.rules.pattern) {
                            input.pattern = item.rules.pattern;
                        }
                        
                        // Store rules for validation
                        input.dataset.rules = JSON.stringify(item.rules);
                    } else {
                        input.type = 'text';
                    }
                    
                    input.className = 'form-input';
                    input.value = item.value;
                    input.dataset.section = sectionName;
                    input.dataset.key = item.key;
                    input.addEventListener('input', (e) => {
                        this.handleInputChange(e.target);
                    });
                    input.addEventListener('blur', (e) => {
                        this.validateField(e.target);
                    });
                    formGroup.appendChild(input);
                }
                
                // Add error message container
                const errorDiv = document.createElement('div');
                errorDiv.className = 'form-error';
                errorDiv.style.display = 'none';
                formGroup.appendChild(errorDiv);

                if (item.comment) {
                    const helper = document.createElement('div');
                    helper.className = 'form-helper';
                    helper.innerHTML = this.highlightSearch(convertUrlsToLinks(item.comment));
                    formGroup.dataset.comment = item.comment.toLowerCase();
                    formGroup.appendChild(helper);
                }

                tabPane.appendChild(formGroup);
            });

            tabContent.appendChild(tabPane);
        });
        
        // Apply search filter
        this.applySearchFilter();
    }
    
    // Highlight search terms in text
    highlightSearch(text) {
        if (!this.searchQuery) {
            return text;
        }
        
        // Create a regex to match the search query (case-insensitive)
        const regex = new RegExp(`(${this.escapeRegex(this.searchQuery)})`, 'gi');
        
        // Replace matches with highlighted version, but preserve HTML tags
        return text.replace(regex, (match) => {
            // Don't highlight if inside HTML tags
            if (match.includes('<') || match.includes('>')) {
                return match;
            }
            return `<span class="search-highlight">${match}</span>`;
        });
    }
    
    // Escape special regex characters
    escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    // Check if a section matches the search query
    sectionMatchesSearch(sectionName) {
        if (!this.searchQuery) return true;
        
        const sectionNameLower = sectionName.toLowerCase();
        if (sectionNameLower.includes(this.searchQuery)) {
            return true;
        }
        
        // Check if any field in this section matches
        const sectionItems = this.settings[sectionName] || [];
        return sectionItems.some(item => {
            const keyLower = item.key.toLowerCase();
            const fieldNameLower = formatFieldName(item.key).toLowerCase();
            const commentLower = (item.comment || '').toLowerCase();
            const valueLower = (item.value || '').toLowerCase();
            
            return keyLower.includes(this.searchQuery) ||
                   fieldNameLower.includes(this.searchQuery) ||
                   commentLower.includes(this.searchQuery) ||
                   valueLower.includes(this.searchQuery);
        });
    }
    
    // Check if a field matches the search query
    fieldMatchesSearch(item) {
        if (!this.searchQuery) return true;
        
        const keyLower = item.key.toLowerCase();
        const fieldNameLower = formatFieldName(item.key).toLowerCase();
        const commentLower = (item.comment || '').toLowerCase();
        const valueLower = (item.value || '').toLowerCase();
        
        return keyLower.includes(this.searchQuery) ||
               fieldNameLower.includes(this.searchQuery) ||
               commentLower.includes(this.searchQuery) ||
               valueLower.includes(this.searchQuery);
    }
    
    // Apply search filter to tabs and fields
    applySearchFilter() {
        if (!this.searchQuery) {
            // Show all tabs and fields
            document.querySelectorAll('.nav-item, .tab-pane, .form-group').forEach(el => {
                el.classList.remove('hidden');
            });
            return;
        }
        
        let hasVisibleTabs = false;
        
        // Filter tabs
        this.sectionOrder.forEach(sectionName => {
            const navItem = document.querySelector(`.nav-item[data-section-name="${sectionName}"]`);
            const tabPane = document.getElementById(`tab-${sectionName}`);
            
            if (this.sectionMatchesSearch(sectionName)) {
                if (navItem) navItem.classList.remove('hidden');
                if (tabPane) tabPane.classList.remove('hidden');
                hasVisibleTabs = true;
                
                // Filter fields within this section
                if (tabPane) {
                    const formGroups = tabPane.querySelectorAll('.form-group');
                    formGroups.forEach(formGroup => {
                        const fieldKey = formGroup.dataset.fieldKey || '';
                        const fieldName = formGroup.dataset.fieldName || '';
                        const comment = formGroup.dataset.comment || '';
                        const input = formGroup.querySelector('.form-input');
                        const value = input ? input.value.toLowerCase() : '';
                        
                        const matches = fieldKey.includes(this.searchQuery) ||
                                       fieldName.includes(this.searchQuery) ||
                                       comment.includes(this.searchQuery) ||
                                       value.includes(this.searchQuery);
                        
                        if (matches) {
                            formGroup.classList.remove('hidden');
                        } else {
                            formGroup.classList.add('hidden');
                        }
                    });
                }
            } else {
                if (navItem) navItem.classList.add('hidden');
                if (tabPane) tabPane.classList.add('hidden');
            }
        });
        
        // Show "no results" message if no tabs match
        const tabContent = document.getElementById('tabContent');
        let noResultsMsg = tabContent.querySelector('.no-results');
        
        if (!hasVisibleTabs) {
            if (!noResultsMsg) {
                noResultsMsg = document.createElement('div');
                noResultsMsg.className = 'no-results';
                noResultsMsg.textContent = `No settings found matching "${this.searchQuery}"`;
                tabContent.appendChild(noResultsMsg);
            }
        } else {
            if (noResultsMsg) {
                noResultsMsg.remove();
            }
        }
        
        // Auto-switch to first visible tab if current tab is hidden
        if (this.currentTab) {
            const currentTabPane = document.getElementById(`tab-${this.currentTab}`);
            if (currentTabPane && currentTabPane.classList.contains('hidden')) {
                // Find first visible tab
                const visibleTab = this.sectionOrder.find(sectionName => {
                    const tabPane = document.getElementById(`tab-${sectionName}`);
                    return tabPane && !tabPane.classList.contains('hidden');
                });
                if (visibleTab) {
                    this.switchTab(visibleTab);
                }
            }
        }
    }
    
    // Perform search (called on input)
    performSearch() {
        this.renderNav();
        this.renderContent();
        
        // If no tab is active or current tab is hidden, switch to first visible tab
        if (!this.currentTab || !this.sectionMatchesSearch(this.currentTab)) {
            const firstVisibleTab = this.sectionOrder.find(sectionName => 
                this.sectionMatchesSearch(sectionName)
            );
            if (firstVisibleTab) {
                this.switchTab(firstVisibleTab);
            }
        }
    }

    switchTab(sectionName) {
        this.currentTab = sectionName;
        
        // Update nav
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelectorAll('.nav-item').forEach((item, index) => {
            if (this.sectionOrder[index] === sectionName) {
                item.classList.add('active');
            }
        });

        // Update content
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });
        const activePane = document.getElementById(`tab-${sectionName}`);
        if (activePane) {
            activePane.classList.add('active');
        }
    }

    handleInputChange(input) {
        const section = input.dataset.section;
        const key = input.dataset.key;
        const newValue = input.value;

        // Update settings object
        const item = this.settings[section].find(i => i.key === key);
        if (item) {
            item.value = newValue;
        }

        // Mark as modified
        input.classList.add('modified');
        this.hasChanges = true;
        this.updateSaveButton();
        
        // Clear error on input
        this.clearFieldError(input);
        
        // Update search filter if search is active
        if (this.searchQuery) {
            this.applySearchFilter();
        }
    }
    
    validateField(input) {
        const rulesJson = input.dataset.rules;
        if (!rulesJson) return true;
        
        const rules = JSON.parse(rulesJson);
        const value = input.value.trim();
        const errorDiv = input.parentElement.querySelector('.form-error');
        
        // Check required
        if (rules.required && !value) {
            this.showFieldError(input, 'This field is required');
            return false;
        }
        
        // Skip other validations if empty and not required
        if (!value && !rules.required) {
            this.clearFieldError(input);
            return true;
        }
        
        // Check type
        if (rules.type === 'number') {
            const numValue = parseFloat(value);
            if (isNaN(numValue)) {
                this.showFieldError(input, 'Must be a valid number');
                return false;
            }
            if (rules.min !== undefined && numValue < rules.min) {
                this.showFieldError(input, `Must be at least ${rules.min}`);
                return false;
            }
            if (rules.max !== undefined && numValue > rules.max) {
                this.showFieldError(input, `Must be at most ${rules.max}`);
                return false;
            }
        }
        
        // Check pattern
        if (rules.pattern) {
            try {
                const regex = new RegExp(rules.pattern);
                if (!regex.test(value)) {
                    this.showFieldError(input, 'Invalid format');
                    return false;
                }
            } catch (e) {
                // Invalid regex pattern, skip
            }
        }
        
        // Check enum
        if (rules.enum && !rules.enum.includes(value)) {
            this.showFieldError(input, `Must be one of: ${rules.enum.join(', ')}`);
            return false;
        }
        
        this.clearFieldError(input);
        return true;
    }
    
    showFieldError(input, message) {
        const errorDiv = input.parentElement.querySelector('.form-error');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            input.classList.add('error');
        }
    }
    
    clearFieldError(input) {
        const errorDiv = input.parentElement.querySelector('.form-error');
        if (errorDiv) {
            errorDiv.style.display = 'none';
            input.classList.remove('error');
        }
    }

    updateSaveButton() {
        const saveBtn = document.getElementById('saveBtn');
        saveBtn.disabled = !this.hasChanges;
    }

    resetChanges() {
        if (this.rawMode) {
            this.rawContent = this.originalRawContent;
            this.hasChanges = false;
            this.render();
            this.updateSaveButton();
            return;
        }
        
        this.settings = JSON.parse(JSON.stringify(this.originalSettings));
        this.hasChanges = false;
        // Preserve search query when resetting
        const searchQuery = this.searchQuery;
        this.render();
        this.searchQuery = searchQuery;
        this.performSearch();
        this.updateSaveButton();
    }

    async saveSettings() {
        // System is always required now
        if (!this.currentSystemName) {
            this.showError('No system selected. Please select a system first.');
            return;
        }
        
        // Handle raw mode saving
        if (this.rawMode) {
            try {
                const url = `/api/settings?system=${encodeURIComponent(this.currentSystemName)}`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        raw: true,
                        content: this.rawContent
                    })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Failed to save settings');
                }

                const result = await response.json();
                this.originalRawContent = this.rawContent;
                this.hasChanges = false;
                this.updateSaveButton();
                this.showSuccess(result.message || 'Settings saved successfully!');
            } catch (error) {
                console.error('Error saving settings:', error);
                this.showError(error.message || 'Failed to save settings. Please try again.');
            }
            return;
        }
        
        // Validate all fields before saving (structured mode)
        const inputs = document.querySelectorAll('.form-input');
        let isValid = true;
        
        inputs.forEach(input => {
            if (!this.validateField(input)) {
                isValid = false;
            }
        });
        
        if (!isValid) {
            this.showError('Please fix validation errors before saving.');
            return;
        }
        
        try {
            // Send settings with order information
            const dataToSave = {
                sections: this.settings,
                sectionOrder: this.sectionOrder
            };
            
            // Build URL with system parameter (always required)
            const url = `/api/settings?system=${encodeURIComponent(this.currentSystemName)}`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dataToSave)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to save settings');
            }

            const result = await response.json();
            
            // Update original settings
            this.originalSettings = JSON.parse(JSON.stringify(this.settings));
            this.hasChanges = false;
            this.updateSaveButton();
            
            // Remove modified class from all inputs
            document.querySelectorAll('.form-input.modified').forEach(input => {
                input.classList.remove('modified');
            });

            this.showSuccess('Settings saved successfully!');
            
            // Reload settings to ensure we have the latest from config file
            setTimeout(() => {
                this.loadSettings();
            }, 500);
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showError('Failed to save settings. Please try again.');
        }
    }

    // System Management Methods
    openSystemModal() {
        document.getElementById('systemModal').classList.add('active');
        this.renderSystemsList();
        this.hideSystemForm();
    }

    closeSystemModal() {
        document.getElementById('systemModal').classList.remove('active');
        this.hideSystemForm();
        this.editingSystemName = null;
    }

    renderSystemsList() {
        const list = document.getElementById('systemsList');
        list.innerHTML = '';
        
        // Filter out System Settings - it's managed separately
        const regularSystems = this.systems.filter(s => s.name !== 'System Settings');
        
        if (regularSystems.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'system-empty-state';
            emptyState.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: var(--text-tertiary);">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="48" height="48" style="opacity: 0.5; margin-bottom: 16px;">
                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                    </svg>
                    <p style="font-size: 14px; margin: 0;">No systems registered yet.</p>
                    <p style="font-size: 13px; margin: 8px 0 0 0; opacity: 0.8;">Click "Add System" above to register a new system.</p>
                </div>
            `;
            list.appendChild(emptyState);
            return;
        }
        
        regularSystems.forEach(system => {
            const item = document.createElement('div');
            item.className = 'system-item';
            item.innerHTML = `
                <div class="system-item-info">
                    <div class="system-item-name">${this.escapeHtml(system.name)}</div>
                    <div class="system-item-path">${this.escapeHtml(system.configPath)}</div>
                </div>
                <div class="system-item-actions">
                    <button class="btn btn-small btn-cancel edit-system-btn" data-name="${system.name}">Edit</button>
                    <button class="btn btn-small btn-danger delete-system-btn" data-name="${system.name}">Delete</button>
                </div>
            `;
            list.appendChild(item);
        });
        
        // Add event listeners
        list.querySelectorAll('.edit-system-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const systemName = e.target.dataset.name;
                this.editSystem(systemName);
            });
        });
        
        list.querySelectorAll('.delete-system-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const systemName = e.target.dataset.name;
                this.deleteSystem(systemName);
            });
        });
    }

    showSystemForm(system = null) {
        const form = document.getElementById('systemForm');
        const formTitle = document.getElementById('formTitle');
        const nameInput = document.getElementById('systemNameInput');
        const pathInput = document.getElementById('systemPathInput');
        const addSystemBtnContainer = document.getElementById('addSystemBtnContainer');
        
        if (system) {
            formTitle.textContent = 'Edit System';
            nameInput.value = system.name;
            pathInput.value = system.configPath;
            this.editingSystemName = system.name;
        } else {
            formTitle.textContent = 'Add System';
            nameInput.value = '';
            pathInput.value = '';
            this.editingSystemName = null;
        }
        
        form.style.display = 'block';
        addSystemBtnContainer.style.display = 'none';
        
        // Scroll form into view and focus first input
        form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        setTimeout(() => nameInput.focus(), 100);
    }

    hideSystemForm() {
        const form = document.getElementById('systemForm');
        const addSystemBtnContainer = document.getElementById('addSystemBtnContainer');
        
        form.style.display = 'none';
        addSystemBtnContainer.style.display = 'block';
        document.getElementById('systemNameInput').value = '';
        document.getElementById('systemPathInput').value = '';
        this.editingSystemName = null;
    }

    editSystem(systemName) {
        // Don't allow editing System Settings through the modal
        if (systemName === 'System Settings') {
            this.showError('System Settings cannot be edited through this interface.');
            return;
        }
        
        const system = this.systems.find(s => s.name === systemName);
        if (system) {
            this.showSystemForm(system);
        }
    }

    async saveSystem() {
        const nameInput = document.getElementById('systemNameInput');
        const pathInput = document.getElementById('systemPathInput');
        
        const name = nameInput.value.trim();
        const configPath = pathInput.value.trim();
        
        if (!name) {
            this.showError('System name is required.');
            return;
        }
        
        if (!configPath) {
            this.showError('Config file path is required.');
            return;
        }
        
        // Validate file extension (client-side check - server will do full validation)
        // Currently only properties-based formats are supported
        const validExtensions = ['.env', '.properties'];
        const hasValidExtension = validExtensions.some(ext => configPath.toLowerCase().endsWith(ext));
        if (!hasValidExtension) {
            this.showError(`Config file must be a properties-based format (${validExtensions.join(', ')})`);
            return;
        }
        
        try {
            let response;
            if (this.editingSystemName) {
                // Update existing system
                response = await fetch(`/api/systems/${encodeURIComponent(this.editingSystemName)}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name, configPath })
                });
            } else {
                // Create new system
                response = await fetch('/api/systems', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name, configPath })
                });
            }
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to save system');
            }
            
            await this.loadSystems();
            this.renderSystemsList();
            this.hideSystemForm();
            this.showSuccess('System saved successfully!');
            // Refresh the system tabs in the main UI
            this.renderMainTabs();
            this.renderSystemSubTabs();
        } catch (error) {
            console.error('Error saving system:', error);
            this.showError(error.message || 'Failed to save system. Please try again.');
        }
    }

    async deleteSystem(systemName) {
        // Don't allow deleting System Settings
        if (systemName === 'System Settings') {
            this.showError('System Settings cannot be deleted.');
            return;
        }
        
        try {
            const response = await fetch(`/api/systems/${encodeURIComponent(systemName)}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) throw new Error('Failed to delete system');
            
            // If deleted system was currently selected, switch to System Settings or first available system
            if (this.currentSystemName === systemName) {
                await this.loadSystems();
                const allSystems = await fetch('/api/systems').then(r => r.json());
                const systemSettings = allSystems.find(s => s.name === 'System Settings');
                if (systemSettings) {
                    // Switch to System Settings
                    this.currentSystemName = 'System Settings';
                    this.currentSystem = systemSettings;
                    this.renderMainTabs();
            this.renderSystemSubTabs();
                    await this.loadSettings();
                } else if (this.systems.length > 0) {
                    this.currentSystemName = this.systems[0].name;
                    this.currentSystem = this.systems[0];
                    this.renderMainTabs();
                    this.renderSystemSubTabs();
                    await this.loadSettings();
                } else {
                    this.currentSystemName = null;
                    this.currentSystem = null;
                    this.settings = {};
                    this.sectionOrder = [];
                    this.originalSettings = {};
                    this.renderMainTabs();
                    this.renderSystemSubTabs();
                    this.render();
                }
            } else {
                await this.loadSystems();
            }
            this.renderSystemsList();
            this.renderMainTabs();
            this.renderSystemSubTabs();
            this.showSuccess('System deleted successfully!');
        } catch (error) {
            console.error('Error deleting system:', error);
            this.showError('Failed to delete system. Please try again.');
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showError(message) {
        const existing = document.querySelector('.error, .success');
        if (existing) existing.remove();

        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.textContent = message;
        document.querySelector('.main-content').insertBefore(errorDiv, document.querySelector('.tab-content'));

        setTimeout(() => errorDiv.remove(), 5000);
    }

    showSuccess(message) {
        const existing = document.querySelector('.error, .success');
        if (existing) existing.remove();

        const successDiv = document.createElement('div');
        successDiv.className = 'success';
        successDiv.textContent = message;
        document.querySelector('.main-content').insertBefore(successDiv, document.querySelector('.tab-content'));

        setTimeout(() => successDiv.remove(), 3000);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new SettingsApp();
});

