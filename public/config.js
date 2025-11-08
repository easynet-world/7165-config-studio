// Format field name by splitting on common delimiters and capitalizing
function formatFieldName(key) {
    const parts = key.split(/[_\-.]+/);
    return parts
        .map(part => {
            if (!part) return '';
            return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
        })
        .filter(part => part.length > 0)
        .join(' ');
}

// Convert URLs in text to clickable links
function convertUrlsToLinks(text) {
    if (!text) return '';
    const urlPattern = /(https?:\/\/[^\s]+|www\.[^\s]+|ftp:\/\/[^\s]+)/gi;
    const escapedText = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    return escapedText.replace(urlPattern, (url) => {
        let href = url;
        if (url.startsWith('www.')) {
            href = 'https://' + url;
        }
        return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="helper-link">${url}</a>`;
    });
}

class SingleConfigApp {
    constructor() {
        this.settings = {};
        this.sectionOrder = [];
        this.originalSettings = {};
        this.currentTab = null;
        this.hasChanges = false;
        this.autoSaveTimer = null;
        this.isSaving = false;
        this.rawMode = false;
        this.rawContent = '';
        this.originalRawContent = '';
        this.systemName = null;
        this.filePath = null;
        
        this.init();
    }

    async init() {
        // First, ensure no theme is set initially
        document.documentElement.removeAttribute('data-theme');
        localStorage.removeItem('configStudioTheme');
        
        this.initTheme();
        this.setupEventListeners();
        this.parseUrlParams();
        
        if (!this.systemName || !this.filePath) {
            this.showError('Missing required parameters. URL must include ?system=<systemName>&file=<absolutePath>');
            return;
        }
        
        this.updateHeaderSystemName();
        this.updateConfigPathDisplay();
        await this.loadSettings();
        this.setupWebSocket();
        
        // Force re-apply theme after everything is loaded
        setTimeout(() => {
            console.log('[Theme] Final theme check after init');
            this.applyThemeFromSettings();
        }, 100);
    }

    parseUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        this.systemName = urlParams.get('system');
        this.filePath = urlParams.get('file');
    }

    initTheme() {
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
        
        // Clear any existing theme attribute and localStorage theme to ensure clean state
        // Don't set theme here - wait for settings to load
        // Theme will be applied from the config file via applyThemeFromSettings()
        document.documentElement.removeAttribute('data-theme');
        
        // Remove any cached theme from localStorage to prevent conflicts
        localStorage.removeItem('configStudioTheme');
        
        const savedCustomCssUrl = localStorage.getItem('configStudioCustomCssUrl');
        if (savedCustomCssUrl) {
            this.customCssUrl = savedCustomCssUrl;
            this.loadCustomCss(savedCustomCssUrl);
        }
    }
    
    loadCustomCss(url) {
        const existingLink = document.getElementById('customThemeCss');
        if (existingLink) {
            existingLink.remove();
        }
        
        const link = document.createElement('link');
        link.id = 'customThemeCss';
        link.rel = 'stylesheet';
        link.href = url;
        
        link.onload = () => {
            console.log('Custom CSS loaded successfully:', url);
        };
        
        link.onerror = () => {
            console.error('Failed to load custom CSS:', url);
            this.showError('Failed to load custom CSS file. Please check the URL and ensure the file is accessible.');
        };
        
        document.head.appendChild(link);
    }

    setTheme(themeName) {
        if (!themeName) {
            console.log('[Theme] setTheme called with empty value, skipping');
            return;
        }
        
        // Trim and normalize theme name
        themeName = String(themeName).trim().toLowerCase();
        console.log('[Theme] setTheme called with:', themeName);
        
        // Apply theme - do NOT save to localStorage, only use config file
        document.documentElement.removeAttribute('data-theme');
        if (themeName && themeName !== 'default') {
            document.documentElement.setAttribute('data-theme', themeName);
            console.log('[Theme] Set data-theme attribute to:', themeName);
        } else {
            console.log('[Theme] Using default theme (no data-theme attribute)');
        }
        
        // Verify it was set immediately
        const verify = document.documentElement.getAttribute('data-theme');
        console.log('[Theme] Verification - current data-theme:', verify || 'null (default)');
        
        // Double-check after a brief delay to see if something changed it
        setTimeout(() => {
            const verifyAgain = document.documentElement.getAttribute('data-theme');
            if (verifyAgain !== verify) {
                console.warn('[Theme] WARNING: Theme was changed after setting! Expected:', verify || 'default', 'Got:', verifyAgain || 'default');
                // Re-apply the theme
                if (themeName && themeName !== 'default') {
                    document.documentElement.setAttribute('data-theme', themeName);
                    console.log('[Theme] Re-applied theme:', themeName);
                }
            }
        }, 50);
    }

    applyThemeFromSettings() {
        console.log('[Theme] ===== applyThemeFromSettings called =====');
        console.log('[Theme] Settings object keys:', Object.keys(this.settings));
        console.log('[Theme] Settings object:', JSON.stringify(this.settings, null, 2));
        console.log('[Theme] Section order:', this.sectionOrder);
        
        // Look for CONFIG_STUDIO_THEME in all sections
        let themeFound = false;
        for (const sectionName in this.settings) {
            const section = this.settings[sectionName];
            console.log(`[Theme] Checking section "${sectionName}":`, Array.isArray(section) ? `Array with ${section.length} items` : typeof section);
            
            if (!Array.isArray(section)) {
                console.log(`[Theme] Section "${sectionName}" is not an array, skipping`);
                continue;
            }
            
            // Log all keys in this section
            const keys = section.map(item => item.key);
            console.log(`[Theme] Keys in section "${sectionName}":`, keys);
            
            const themeItem = section.find(item => item.key === 'CONFIG_STUDIO_THEME');
            if (themeItem) {
                let themeValue = String(themeItem.value).trim();
                console.log('[Theme] ✓ Found CONFIG_STUDIO_THEME in config!');
                console.log('[Theme] Raw value:', themeValue);
                console.log('[Theme] Full theme item:', JSON.stringify(themeItem, null, 2));
                
                // Map 'light' to 'default' for theme system
                if (themeValue === 'light') {
                    themeValue = 'default';
                    console.log('[Theme] Mapped "light" to "default"');
                }
                
                console.log('[Theme] Final theme value to apply:', themeValue);
                
                // Apply theme multiple times to ensure it sticks
                this.setTheme(themeValue);
                setTimeout(() => this.setTheme(themeValue), 10);
                setTimeout(() => this.setTheme(themeValue), 50);
                
                // Verify it was applied
                const applied = document.documentElement.getAttribute('data-theme');
                console.log('[Theme] ✓ Theme attribute after apply:', applied || 'default (no attribute)');
                console.log('[Theme] Current HTML element:', document.documentElement.outerHTML.substring(0, 200));
                
                themeFound = true;
                return;
            } else {
                console.log(`[Theme] No CONFIG_STUDIO_THEME found in section "${sectionName}"`);
            }
        }
        
        if (!themeFound) {
            console.log('[Theme] ✗ No CONFIG_STUDIO_THEME found in any section, using fallback');
            // If no theme found in settings, use default theme from server config as fallback
            this.loadDefaultThemeAndApply();
        }
    }
    
    async loadDefaultThemeAndApply() {
        console.log('[Theme] loadDefaultThemeAndApply called - no theme found in config file');
        try {
            const response = await fetch('/api/config');
            if (response.ok) {
                const config = await response.json();
                if (config.defaultTheme) {
                    let themeValue = config.defaultTheme;
                    if (themeValue === 'light') {
                        themeValue = 'default';
                    }
                    console.log('[Theme] Using default theme from server config:', themeValue);
                    this.setTheme(themeValue);
                    return;
                }
            }
        } catch (error) {
            console.warn('[Theme] Failed to load default theme from server:', error);
        }
        
        // Final fallback to cyberpunk - only if no theme found anywhere
        console.log('[Theme] No theme found anywhere, using fallback: cyberpunk');
        this.setTheme('cyberpunk');
    }

    setupEventListeners() {
        document.getElementById('closeBtn').addEventListener('click', () => {
            window.close();
        });
    }

    updateHeaderSystemName() {
        const headerSystemName = document.getElementById('headerSystemName');
        if (headerSystemName && this.systemName) {
            headerSystemName.textContent = this.escapeHtml(this.systemName);
        }
    }

    updateConfigPathDisplay() {
        const pathDisplay = document.getElementById('configPathDisplay');
        if (!pathDisplay) return;
        
        if (this.filePath) {
            pathDisplay.innerHTML = `
                <div class="config-path-content">
                    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" class="config-path-icon">
                        <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z"/>
                    </svg>
                    <span class="config-path-label">Config File:</span>
                    <span class="config-path-value" title="${this.escapeHtml(this.filePath)}">${this.escapeHtml(this.filePath)}</span>
                </div>
            `;
            pathDisplay.classList.add('active');
        } else {
            pathDisplay.classList.remove('active');
        }
    }

    setupWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;
        
        try {
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                console.log('WebSocket connected');
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    
                    if (message.type === 'file-changed') {
                        const messageSystemName = message.systemName || message.systemId;
                        if (messageSystemName === this.systemName) {
                            console.log('Config file changed - reloading settings...');
                            this.showSuccess('Configuration file was updated. Reloading...');
                            this.loadSettings();
                        }
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

    async loadSettings() {
        try {
            if (!this.systemName || !this.filePath) {
                throw new Error('System name and file path are required');
            }
            
            const url = `/api/settings?t=${Date.now()}&system=${encodeURIComponent(this.systemName)}&file=${encodeURIComponent(this.filePath)}`;
            
            const response = await fetch(url, {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });
            
            if (!response.ok) {
                let errorMessage = 'Failed to load settings';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorMessage;
                } catch (e) {
                    errorMessage = response.statusText || errorMessage;
                }
                throw new Error(errorMessage);
            }
            
            const data = await response.json();
            
            if (data.raw === true) {
                this.rawMode = true;
                this.rawContent = data.content || '';
                this.originalRawContent = this.rawContent;
                this.settings = {};
                this.sectionOrder = [];
                this.originalSettings = {};
                this.currentTab = null;
                this.hasChanges = false;
                this.render();
                return;
            }
            
            this.rawMode = false;
            this.currentTab = null;
            this.settings = data.sections || data;
            this.sectionOrder = data.sectionOrder || Object.keys(this.settings).sort();
            this.originalSettings = JSON.parse(JSON.stringify(this.settings));
            this.hasChanges = false;
            
            // Log the actual API response structure for debugging
            console.log('[Theme] API Response data:', JSON.stringify(data, null, 2));
            console.log('[Theme] Parsed settings:', JSON.stringify(this.settings, null, 2));
            console.log('[Theme] Section order:', this.sectionOrder);
            
            // Apply theme from settings BEFORE render to ensure it's applied early
            // But also after settings are fully loaded
            console.log('[Theme] Settings loaded, applying theme...');
            this.applyThemeFromSettings();
            
            this.render();
            
            // Apply theme again AFTER render to ensure it's not overridden
            // Use setTimeout to ensure DOM is fully updated
            setTimeout(() => {
                console.log('[Theme] Re-applying theme after render');
                this.applyThemeFromSettings();
            }, 0);
            
            // One more time after a longer delay to catch any late overrides
            setTimeout(() => {
                console.log('[Theme] Final theme check after all operations');
                this.applyThemeFromSettings();
            }, 200);
        } catch (error) {
            console.error('Error loading settings:', error);
            this.showError(`Failed to load settings: ${error.message || 'Unknown error'}`);
            this.settings = {};
            this.sectionOrder = [];
            this.originalSettings = {};
            this.render();
        }
    }

    render() {
        this.renderNav();
        this.renderContent();
        
        if (Object.keys(this.settings).length === 0 && !this.rawMode) {
            const tabContent = document.getElementById('tabContent');
            const existingEmptyState = tabContent.querySelector('.empty-state');
            if (existingEmptyState) {
                existingEmptyState.remove();
            }
            
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.innerHTML = `
                <div class="empty-state-content">
                    <h3>No Configuration Settings</h3>
                    <p>The config file exists but contains no settings, or the file is empty.</p>
                </div>
            `;
            tabContent.appendChild(emptyState);
        }
        
        if (!this.rawMode && !this.currentTab && this.sectionOrder.length > 0) {
            this.switchTab(this.sectionOrder[0]);
        }
    }

    renderNav() {
        const navMenu = document.getElementById('navMenu');
        if (!navMenu) return;
        
        navMenu.innerHTML = '';
        
        // Don't render nav in raw mode
        if (this.rawMode) {
            return;
        }

        // Use sectionOrder to preserve order from config file
        this.sectionOrder.forEach(sectionName => {
            const navItem = document.createElement('div');
            navItem.className = 'nav-item';
            navItem.dataset.sectionName = sectionName;
            if (this.currentTab === sectionName) {
                navItem.classList.add('active');
            }
            
            // Show section name as-is
            navItem.innerHTML = `
                <span>${this.escapeHtml(sectionName)}</span>
            `;
            
            navItem.addEventListener('click', () => this.switchTab(sectionName));
            navMenu.appendChild(navItem);
        });
    }

    renderContent() {
        const tabContent = document.getElementById('tabContent');
        if (!tabContent) return;
        
        tabContent.innerHTML = '';

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
            
            const textarea = document.getElementById('rawContentTextarea');
            textarea.addEventListener('input', () => {
                this.rawContent = textarea.value;
                this.hasChanges = (this.rawContent !== this.originalRawContent);
                this.debouncedAutoSave();
            });
            return;
        }

        if (Object.keys(this.settings).length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.innerHTML = `
                <div class="empty-state-content">
                    <h3>No Configuration Settings</h3>
                    <p>The config file exists but contains no settings, or the file is empty.</p>
                </div>
            `;
            tabContent.appendChild(emptyState);
            return;
        }

        // Render all sections as tab panes (only one visible at a time)
        this.sectionOrder.forEach(sectionName => {
            const tabPane = document.createElement('div');
            tabPane.className = 'tab-pane';
            tabPane.id = `tab-${sectionName}`;
            if (this.currentTab === sectionName) {
                tabPane.classList.add('active');
            }

            const sectionTitle = document.createElement('h2');
            sectionTitle.className = 'section-title';
            sectionTitle.textContent = sectionName;
            tabPane.appendChild(sectionTitle);

            this.settings[sectionName].forEach(item => {
                const formGroup = document.createElement('div');
                formGroup.className = 'form-group';

                const label = document.createElement('label');
                label.className = 'form-label';
                label.innerHTML = formatFieldName(item.key);
                formGroup.appendChild(label);

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
                        // Auto-save with debouncing
                        this.debouncedAutoSave();
                        
                        // Apply theme immediately (use themeValue for theme system)
                        this.setTheme(themeValue);
                        
                        // Also update the input change handler for consistency
                        this.handleInputChange(e.target);
                    });
                    
                    formGroup.appendChild(select);
                } else {
                    const input = document.createElement('input');
                    
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
                
                const errorDiv = document.createElement('div');
                errorDiv.className = 'form-error';
                errorDiv.style.display = 'none';
                formGroup.appendChild(errorDiv);

                if (item.comment) {
                    const helper = document.createElement('div');
                    helper.className = 'form-helper';
                    helper.innerHTML = convertUrlsToLinks(item.comment);
                    formGroup.appendChild(helper);
                }

                tabPane.appendChild(formGroup);
            });

            tabContent.appendChild(tabPane);
        });
    }

    switchTab(sectionName) {
        this.currentTab = sectionName;
        
        // Update nav
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        const activeNavItem = document.querySelector(`.nav-item[data-section-name="${sectionName}"]`);
        if (activeNavItem) {
            activeNavItem.classList.add('active');
        }
        
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

        const item = this.settings[section].find(i => i.key === key);
        if (item) {
            item.value = newValue;
        }

        input.classList.add('modified');
        this.hasChanges = true;
        this.clearFieldError(input);
        this.debouncedAutoSave();
    }
    
    debouncedAutoSave() {
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
        }
        
        if (this.isSaving) {
            return;
        }
        
        this.autoSaveTimer = setTimeout(() => {
            this.autoSave();
        }, 1000);
    }
    
    async autoSave() {
        if (!this.hasChanges || this.isSaving) {
            return;
        }
        
        if (!this.systemName || !this.filePath) {
            return;
        }
        
        this.isSaving = true;
        this.showSavingIndicator();
        
        try {
            await this.saveSettings();
        } catch (error) {
            console.error('Auto-save error:', error);
        } finally {
            this.isSaving = false;
            this.hideSavingIndicator();
        }
    }
    
    showSavingIndicator() {
        const actionButtons = document.getElementById('actionButtons');
        if (actionButtons) {
            actionButtons.style.display = 'flex';
            actionButtons.innerHTML = `
                <div class="auto-save-indicator">
                    <span class="auto-save-spinner"></span>
                    <span class="auto-save-text">Saving...</span>
                </div>
            `;
        }
    }
    
    hideSavingIndicator() {
        const actionButtons = document.getElementById('actionButtons');
        if (actionButtons) {
            actionButtons.innerHTML = `
                <div class="auto-save-indicator saved">
                    <span class="auto-save-text">Saved</span>
                </div>
            `;
            setTimeout(() => {
                actionButtons.style.display = 'none';
            }, 2000);
        }
    }
    
    validateField(input) {
        const rulesJson = input.dataset.rules;
        if (!rulesJson) return true;
        
        const rules = JSON.parse(rulesJson);
        const value = input.value.trim();
        const errorDiv = input.parentElement.querySelector('.form-error');
        
        if (rules.required && !value) {
            this.showFieldError(input, 'This field is required');
            return false;
        }
        
        if (!value && !rules.required) {
            this.clearFieldError(input);
            return true;
        }
        
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

    async saveSettings() {
        if (!this.systemName || !this.filePath) {
            this.showError('System name and file path are required.');
            return;
        }
        
        if (this.rawMode) {
            try {
                const url = `/api/settings?system=${encodeURIComponent(this.systemName)}&file=${encodeURIComponent(this.filePath)}`;
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

                this.originalRawContent = this.rawContent;
                this.hasChanges = false;
            } catch (error) {
                console.error('Error saving settings:', error);
                this.showError(error.message || 'Failed to save settings. Please try again.');
            }
            return;
        }
        
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
            const dataToSave = {
                sections: this.settings,
                sectionOrder: this.sectionOrder
            };
            
            const url = `/api/settings?system=${encodeURIComponent(this.systemName)}&file=${encodeURIComponent(this.filePath)}`;
            
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

            this.originalSettings = JSON.parse(JSON.stringify(this.settings));
            this.hasChanges = false;
            
            document.querySelectorAll('.form-input.modified').forEach(input => {
                input.classList.remove('modified');
            });
            
            setTimeout(() => {
                this.loadSettings();
            }, 500);
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showError('Failed to save settings. Please try again.');
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
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.insertBefore(errorDiv, document.querySelector('.tab-content'));
        }

        setTimeout(() => errorDiv.remove(), 5000);
    }

    showSuccess(message) {
        const existing = document.querySelector('.error, .success');
        if (existing) existing.remove();

        const successDiv = document.createElement('div');
        successDiv.className = 'success';
        successDiv.textContent = message;
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.insertBefore(successDiv, document.querySelector('.tab-content'));
        }

        setTimeout(() => successDiv.remove(), 3000);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new SingleConfigApp();
});

