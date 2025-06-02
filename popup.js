// Main App
class ReadLaterApp {
    constructor() {
        this.items = [];
        this.init();
    }

    async init() {
        try {
            await this.load();
            await Theme.init();
            
            // Wait for i18n to be available and initialize
            if (window.I18n && typeof window.I18n.init === 'function') {
                await window.I18n.init();
                console.log('I18n initialized successfully');
            } else {
                // Wait a bit longer and try again - sometimes script loading order can cause issues
                await new Promise(resolve => setTimeout(resolve, 100));
                if (window.I18n && typeof window.I18n.init === 'function') {
                    await window.I18n.init();
                    console.log('I18n initialized after retry');
                } else {
                    console.error('I18n module not available after retry');
                    // Show warning but continue
                    UI.showToast('Translation module not available, using default language', 'error');
                }
            }
            
            await CategoryUI.renderCategoryFilter();
            this.setupEvents();
            await this.loadAutoDeleteSettings(); // Load auto-delete settings on startup
            this.render();
            this.updateBadge();
        } catch (error) {
            console.error('Error initializing app:', error);
        }
    }

    async load() {
        this.items = await Storage.load();
    }

    setupEvents() {
        // Add page button
        document.getElementById('addPage').addEventListener('click', () => {
            this.addCurrentPage();
        });

        // Settings panel
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.showSettings();
        });

        document.getElementById('closeSettings').addEventListener('click', () => {
            this.hideSettings();
        });

        // Theme selection
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const theme = e.currentTarget.getAttribute('data-theme');
                Theme.setTheme(theme);
                this.updateThemeButtons(theme);
            });
        });

        // Language selection
        document.querySelectorAll('.language-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const language = e.currentTarget.getAttribute('data-language');
                if (window.I18n && typeof window.I18n.setLanguage === 'function') {
                    window.I18n.setLanguage(language);
                    this.updateLanguageButtons(language);
                    // Update count display with new language
                    this.updateCountDisplay();
                }
            });
        });

        // Search with debounce
        let searchTimeout;
        document.getElementById('search').addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                UI.filterItems(e.target.value);
            }, 200);
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                this.addCurrentPage();
            }
            
            if (e.key === 'Escape') {
                const search = document.getElementById('search');
                if (search.value) {
                    search.value = '';
                    UI.filterItems('');
                    search.blur();
                } else {
                    // Close settings panel if open
                    this.hideSettings();
                }
            }
        });

        // Auto-delete settings
        document.getElementById('autoDeleteEnabled').addEventListener('change', (e) => {
            this.handleAutoDeleteToggle(e.target.checked);
        });

        // 저장 버튼 클릭 이벤트
        document.getElementById('saveAutoDeleteSettings').addEventListener('click', () => {
            this.saveAutoDeleteSettings();
        });

        // 실시간 변경 감지 (선택사항)
        document.getElementById('autoDeleteValue').addEventListener('input', (e) => {
            // 입력값 검증만 수행 (저장은 버튼 클릭 시)
            const value = parseInt(e.target.value);
            if (value < 1) {
                e.target.value = 1;
            }
        });

        // Unit button click handlers
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('unit-btn')) {
                // Remove active class from all unit buttons
                document.querySelectorAll('.unit-btn').forEach(btn => btn.classList.remove('active'));
                // Add active class to clicked button
                e.target.classList.add('active');
                // 선택만 변경, 저장은 버튼 클릭 시
            }
        });
    }

    showSettings() {
        const panel = document.getElementById('settingsPanel');
        panel.style.display = 'block';
        // Trigger reflow for animation
        panel.offsetHeight;
        panel.classList.add('show');
        
        // Update theme buttons to reflect current theme
        this.updateThemeButtons(Theme.currentTheme);
        
        // Update language buttons to reflect current language
        if (window.I18n && window.I18n.currentLanguage) {
            this.updateLanguageButtons(window.I18n.currentLanguage);
        }
        
        // Load and display auto-delete settings
        this.loadAutoDeleteSettings();
    }
    
    hideSettings() {
        const panel = document.getElementById('settingsPanel');
        panel.classList.remove('show');
        setTimeout(() => {
            panel.style.display = 'none';
        }, 300); // Match CSS transition duration
    }
    
    updateThemeButtons(activeTheme) {
        document.querySelectorAll('.theme-btn').forEach(btn => {
            const theme = btn.getAttribute('data-theme');
            btn.classList.toggle('active', theme === activeTheme);
        });
    }

    updateLanguageButtons(activeLanguage) {
        document.querySelectorAll('.language-btn').forEach(btn => {
            const language = btn.getAttribute('data-language');
            btn.classList.toggle('active', language === activeLanguage);
        });
    }

    updateCountDisplay() {
        const unread = this.items.filter(item => !item.read).length;
        const countEl = document.getElementById('count');
        if (countEl && window.i18n && typeof window.i18n.t === 'function') {
            countEl.textContent = window.i18n.t('itemCount', {
                total: this.items.length,
                unread: unread
            });
        }
    }

    async addCurrentPage() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab.url || Utils.isRestrictedUrl(tab.url)) {
                UI.showToast(window.i18n.t('cannotSavePage'), 'error');
                return;
            }

            // Check for duplicates before showing category selector
            const existingItem = await Storage.findItemByUrl(tab.url);
            let result = null; // Declare result variable in function scope
            
            if (existingItem) {
                // Show appropriate modal based on read status
                result = await CategoryUI.showCategorySelectorForExistingItem(existingItem);
                
                if (result === null) {
                    // User cancelled
                    return;
                } else if (result === 'no-change') {
                    UI.showToast(window.i18n.t('alreadySaved'), 'error');
                    return;
                } else if (result === 'overwrite') {
                    // User wants to save as new item - proceed with new item creation
                    // Fall through to the new item creation logic below
                } else {
                    // Category was updated for existing item
                    UI.showToast(window.i18n.t('categoryChanged'), 'success');
                    await this.load();
                    this.render();
                    await CategoryUI.renderCategoryFilter();
                    return;
                }
            }

            // If we reach here, either no duplicate exists or user chose to overwrite
            // Show category selector for new item
            const selectedCategoryId = await CategoryUI.showCategorySelectorForNewItem();
            
            // If user cancelled category selection, don't add the item
            if (selectedCategoryId === null) {
                return;
            }

            const newItem = {
                id: Utils.generateId(),
                title: tab.title || 'Untitled',
                url: tab.url,
                addedAt: new Date().toISOString(),
                read: false,
                categoryId: selectedCategoryId || 'uncategorized'
            };

            // Skip duplicate check if this is an overwrite operation
            const skipDuplicateCheck = existingItem && result === 'overwrite';
            
            // If overwriting, delete the existing item first
            if (existingItem && result === 'overwrite') {
                await Storage.remove(existingItem.id);
            }
            
            const saveResult = await Storage.add(newItem, skipDuplicateCheck);
            UI.showToast(saveResult.message, saveResult.success ? 'success' : 'error');
            
            if (saveResult.success) {
                await this.load();
                this.render();
                await CategoryUI.renderCategoryFilter(); // Update category filter
                this.updateBadge();
            }
        } catch (error) {
            console.error('Error adding page:', error);
            UI.showToast(window.i18n.t('pageSaveError'), 'error');
        }
    }

    async toggleRead(id) {
        // Show animation first
        const item = this.items.find(i => i.id === id);
        if (item) {
            UI.animateReadToggle(id, !item.read);
        }
        
        const result = await Storage.toggleRead(id);
        UI.showToast(result.message, result.success ? 'success' : 'error');
        
        if (result.success) {
            await this.load();
            this.render();
            await CategoryUI.renderCategoryFilter(); // Update category filter badges
            this.updateBadge();
        }
    }

    async deleteItem(id) {
        const result = await Storage.remove(id);
        UI.showToast(result.message, result.success ? 'success' : 'error');
        
        if (result.success) {
            await this.load();
            this.render();
            this.updateBadge();
        }
    }

    async showReminderModal(id) {
        const item = this.items.find(i => i.id === id);
        if (!item) return;

        // 현재 날짜와 시간을 기본값으로 설정
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate()); // 오늘 날짜로 설정

        // 날짜 포맷: YYYY-MM-DD
        const defaultDate = item.reminder?.date || tomorrow.toISOString().split('T')[0];
        
        // 시간 포맷: HH:MM
        let defaultHours = now.getHours().toString().padStart(2, '0');
        let defaultMinutes = now.getMinutes().toString().padStart(2, '0');
        const defaultTime = item.reminder?.time || `${defaultHours}:${defaultMinutes}`;

        // Create modal HTML with proper overlay structure
        const modalHTML = `
            <div class="modal" id="reminderModal">
                <div class="modal-content reminder-modal">
                    <div class="modal-header">
                        <h3>${window.i18n.t('reminderTitle')}</h3>
                        <button class="btn-close" data-action="close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="reminder-item-info">
                            <h4>${Utils.escapeHtml(item.title)}</h4>
                            <p class="item-url" title="${Utils.escapeHtml(item.url)}">${Utils.escapeHtml(Utils.truncateUrl(item.url, 50))}</p>
                        </div>
                        <div class="form-group">
                            <label for="reminderMessage">${window.i18n.t('reminderMessage')}</label>
                            <textarea id="reminderMessage" placeholder="${window.i18n.t('reminderMessagePlaceholder')}" 
                                      value="${item.reminder?.message || ''}">${item.reminder?.message || ''}</textarea>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="reminderDate">${window.i18n.t('reminderDate')}</label>
                                <input type="date" id="reminderDate" value="${defaultDate}">
                            </div>
                            <div class="form-group">
                                <label for="reminderTime">${window.i18n.t('reminderTime')}</label>
                                <input type="time" id="reminderTime" value="${defaultTime}">
                            </div>
                        </div>
                        ${item.reminder ? `
                            <div class="current-reminder">
                                <p><strong>${window.i18n.t('currentReminder')}</strong></p>
                                <p>${new Date(item.reminder.scheduledTime).toLocaleString()}</p>
                            </div>
                        ` : ''}
                    </div>
                    <div class="modal-footer">
                        ${item.reminder ? `<button class="btn btn-delete" data-action="remove" data-id="${id}">${window.i18n.t('removeReminder')}</button>` : ''}
                        <button class="btn" data-action="cancel">${window.i18n.t('cancel')}</button>
                        <button class="btn btn-primary" data-action="save" data-id="${id}">${window.i18n.t('setReminder')}</button>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('reminderModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to DOM
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Set minimum date to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('reminderDate').min = today;

        // Add modal event listeners
        const modal = document.getElementById('reminderModal');
        
        // Close modal when clicking overlay
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                document.removeEventListener('keydown', handleEscape);
            }
        });

        // Handle button clicks
        modal.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            const targetId = e.target.dataset.id;
            
            if (action === 'close' || action === 'cancel') {
                modal.remove();
                document.removeEventListener('keydown', handleEscape);
            } else if (action === 'save' && targetId) {
                this.saveReminder(targetId);
            } else if (action === 'remove' && targetId) {
                this.removeReminder(targetId);
            }
        });

        // Add ESC key handler
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);

        // Show modal and focus
        setTimeout(() => {
            document.getElementById('reminderMessage').focus();
        }, 100);
    }

    async saveReminder(id) {
        const message = document.getElementById('reminderMessage').value.trim();
        const date = document.getElementById('reminderDate').value;
        const time = document.getElementById('reminderTime').value;

        if (!date || !time) {
            UI.showToast(window.i18n.t('reminderDateTimeRequired'), 'error');
            return;
        }

        const scheduledTime = new Date(`${date}T${time}`);
        const now = new Date();

        if (scheduledTime <= now) {
            UI.showToast(window.i18n.t('reminderFutureTime'), 'error');
            return;
        }

        const reminderData = {
            message: message || window.i18n.t('reminderDefaultMessage'),
            date,
            time,
            scheduledTime: scheduledTime.toISOString()
        };

        try {
            // Save reminder to storage
            await Storage.setReminder(id, reminderData);
            
            // Create Chrome alarm
            await chrome.alarms.create(`reminder_${id}`, {
                when: scheduledTime.getTime()
            });

            UI.showToast(window.i18n.t('reminderSet'), 'success');
            
            // Close modal
            document.getElementById('reminderModal').remove();
            
            // Refresh UI
            await this.load();
            this.render();
        } catch (error) {
            console.error('Error setting reminder:', error);
            UI.showToast(window.i18n.t('reminderError'), 'error');
        }
    }

    async removeReminder(id) {
        try {
            // Remove from storage
            await Storage.removeReminder(id);
            
            // Remove Chrome alarm
            await chrome.alarms.clear(`reminder_${id}`);

            UI.showToast(window.i18n.t('reminderRemoved'), 'success');
            
            // Close modal
            document.getElementById('reminderModal').remove();
            
            // Refresh UI
            await this.load();
            this.render();
        } catch (error) {
            console.error('Error removing reminder:', error);
            UI.showToast(window.i18n.t('reminderError'), 'error');
        }
    }

    render() {
        const unread = this.items.filter(item => !item.read).length;
        UI.updateCount(this.items.length, unread);
        
        // Apply current category filter
        let itemsToRender = this.items;
        if (CategoryUI.currentFilter !== 'all') {
            itemsToRender = this.items.filter(item => 
                (item.categoryId || 'uncategorized') === CategoryUI.currentFilter
            );
        }
        
        UI.renderList(itemsToRender);
    }

    async updateBadge() {
        try {
            const unread = this.items.filter(item => !item.read).length;
            const text = unread > 0 ? unread.toString() : '';
            
            await chrome.action.setBadgeText({ text });
            await chrome.action.setBadgeBackgroundColor({ color: '#007aff' });
        } catch (error) {
            console.error('Error updating badge:', error);
        }
    }

    // 자동 삭제 설정 저장 (저장 버튼 클릭 시)
    async saveAutoDeleteSettings() {
        const enabled = document.getElementById('autoDeleteEnabled').checked;
        
        if (!enabled) {
            UI.showToast(window.i18n.t('autoDeleteDisabled'), 'info');
            return;
        }

        const value = parseInt(document.getElementById('autoDeleteValue').value);
        const activeUnitBtn = document.querySelector('.unit-btn.active');
        const unit = activeUnitBtn ? activeUnitBtn.dataset.unit : 'days';
        
        if (!value || value < 1) {
            UI.showToast(window.i18n.t('enterValidTime'), 'error');
            document.getElementById('autoDeleteValue').focus();
            return;
        }
        
        const settings = { enabled, value, unit };
        
        try {
            await Storage.setAutoDeleteSettings(settings);
            
            // background script에 스케줄러 재설정 요청
            await chrome.runtime.sendMessage({ 
                action: 'updateAutoDeleteScheduler',
                settings: settings 
            });
            
            // 사용자에게 설정 완료 피드백
            const unitName = window.i18n.t(`timeUnit_${unit}`);
            UI.showToast(window.i18n.t('autoDeleteSettingsSaved', { value, unit: unitName }), 'success');
            
            console.log('📡 Auto-delete settings saved:', settings);
        } catch (error) {
            console.error('Error saving auto-delete settings:', error);
            UI.showToast(window.i18n && window.i18n.t ? window.i18n.t('saveFailed') : '설정 저장에 실패했습니다', 'error');
        }
    }

    // 자동 삭제 토글 (체크박스 변경 시)
    async handleAutoDeleteToggle(enabled) {
        const timeRow = document.getElementById('autoDeleteTimeRow');
        timeRow.style.display = enabled ? 'flex' : 'none';
        
        if (!enabled) {
            // 비활성화 시 즉시 설정 저장
            const settings = { enabled: false, value: 30, unit: 'days' };
            await Storage.setAutoDeleteSettings(settings);
            
            // background script에 스케줄러 재설정 요청
            try {
                await chrome.runtime.sendMessage({ 
                    action: 'updateAutoDeleteScheduler',
                    settings: settings 
                });
                UI.showToast(window.i18n && window.i18n.t ? window.i18n.t('autoDeleteDisabled') : '자동 삭제가 비활성화되었습니다', 'info');
            } catch (error) {
                console.error('Error requesting scheduler update:', error);
                UI.showToast(window.i18n && window.i18n.t ? window.i18n.t('saveFailed') : '설정 저장에 실패했습니다', 'error');
            }
        } else {
            UI.showToast(window.i18n && window.i18n.t ? window.i18n.t('autoDeleteClickSave') : '시간을 설정하고 저장 버튼을 클릭하세요', 'info');
        }
    }

    async loadAutoDeleteSettings() {
        const settings = await Storage.getAutoDeleteSettings();
        
        document.getElementById('autoDeleteEnabled').checked = settings.enabled;
        document.getElementById('autoDeleteValue').value = settings.value;
        
        // 단위 버튼 활성화
        document.querySelectorAll('.unit-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.unit === settings.unit);
        });
        
        const timeRow = document.getElementById('autoDeleteTimeRow');
        timeRow.style.display = settings.enabled ? 'flex' : 'none';
    }
}

// Initialize app when DOM content is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check if required modules are loaded
    if (!window.I18n) {
        console.error('Error: I18n module not loaded. Check script loading order.');
        return;
    }
    
    // Initialize the app
    const app = new ReadLaterApp();
    
    // Global functions for button handlers
    window.App = {
        toggleRead: (id) => app.toggleRead(id),
        deleteItem: (id) => app.deleteItem(id),
        showReminderModal: (id) => app.showReminderModal(id),
        saveReminder: (id) => app.saveReminder(id),
        removeReminder: (id) => app.removeReminder(id),
        load: () => app.load(),
        render: () => app.render(),
        updateCountDisplay: () => app.updateCountDisplay(),
        get items() { return app.items; }
    };
    
    // Make CategoryUI globally accessible for i18n updates
    window.CategoryUI = CategoryUI;
});