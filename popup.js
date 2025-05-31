// Main App
class ReadLaterApp {
    constructor() {
        this.items = [];
        this.init();
    }

    async init() {
        await this.load();
        await Theme.init();
        await CategoryUI.renderCategoryFilter();
        this.setupEvents();
        this.render();
        this.updateBadge();
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

    async addCurrentPage() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab.url || Utils.isRestrictedUrl(tab.url)) {
                UI.showToast('이 페이지는 저장할 수 없습니다', 'error');
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
                    UI.showToast('이미 저장된 페이지입니다', 'error');
                    return;
                } else if (result === 'overwrite') {
                    // User wants to save as new item - proceed with new item creation
                    // Fall through to the new item creation logic below
                } else {
                    // Category was updated for existing item
                    UI.showToast('카테고리가 변경되었습니다', 'success');
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
            UI.showToast('페이지 저장 중 오류가 발생했습니다', 'error');
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
            UI.showToast('자동 삭제가 비활성화되어 있습니다', 'info');
            return;
        }

        const value = parseInt(document.getElementById('autoDeleteValue').value);
        const activeUnitBtn = document.querySelector('.unit-btn.active');
        const unit = activeUnitBtn ? activeUnitBtn.dataset.unit : 'days';
        
        if (!value || value < 1) {
            UI.showToast('올바른 시간 값을 입력해주세요', 'error');
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
            const unitName = unit === 'minutes' ? '분' : unit === 'hours' ? '시간' : '일';
            UI.showToast(`자동 삭제 설정 저장됨: ${value}${unitName} 후 삭제`, 'success');
            
            console.log('📡 Auto-delete settings saved:', settings);
        } catch (error) {
            console.error('Error saving auto-delete settings:', error);
            UI.showToast('설정 저장에 실패했습니다', 'error');
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
                UI.showToast('자동 삭제가 비활성화되었습니다', 'info');
            } catch (error) {
                console.error('Error requesting scheduler update:', error);
                UI.showToast('설정 저장에 실패했습니다', 'error');
            }
        } else {
            UI.showToast('시간을 설정하고 저장 버튼을 클릭하세요', 'info');
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

// Initialize app
const app = new ReadLaterApp();

// Global functions for button handlers
window.App = {
    toggleRead: (id) => app.toggleRead(id),
    deleteItem: (id) => app.deleteItem(id),
    load: () => app.load(),
    render: () => app.render()
};