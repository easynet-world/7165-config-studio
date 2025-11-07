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
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadSettings();
    }

    setupEventListeners() {
        document.getElementById('closeBtn').addEventListener('click', () => {
            window.close();
        });

        document.getElementById('cancelBtn').addEventListener('click', () => {
            if (this.hasChanges) {
                this.resetChanges();
            }
        });

        document.getElementById('saveBtn').addEventListener('click', () => {
            this.saveSettings();
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

    async loadSettings() {
        try {
            // Always fetch fresh data with cache-busting timestamp
            const response = await fetch(`/api/settings?t=${Date.now()}`, {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });
            if (!response.ok) throw new Error('Failed to load settings');
            
            const data = await response.json();
            // Handle both old format (just sections) and new format (sections + sectionOrder)
            this.settings = data.sections || data;
            this.sectionOrder = data.sectionOrder || Object.keys(this.settings).sort();
            this.originalSettings = JSON.parse(JSON.stringify(this.settings));
            this.render();
        } catch (error) {
            console.error('Error loading settings:', error);
            this.showError('Failed to load settings. Please check if .env file exists.');
        }
    }

    render() {
        this.renderNav();
        this.renderContent();
        
        // Activate first tab if none is active (considering search filter)
        if (!this.currentTab && this.sectionOrder.length > 0) {
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
        navMenu.innerHTML = '';

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
        tabContent.innerHTML = '';

        if (Object.keys(this.settings).length === 0) {
            tabContent.innerHTML = '<div class="loading">No settings found. Please create a .env file.</div>';
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
        // Validate all fields before saving
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
            
            const response = await fetch('/api/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dataToSave)
            });

            if (!response.ok) throw new Error('Failed to save settings');

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
            
            // Reload settings to ensure we have the latest from .env file
            setTimeout(() => {
                this.loadSettings();
            }, 500);
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showError('Failed to save settings. Please try again.');
        }
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

