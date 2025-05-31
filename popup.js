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
    }

    showSettings() {
        const panel = document.getElementById('settingsPanel');
        panel.style.display = 'block';
        // Trigger reflow for animation
        panel.offsetHeight;
        panel.classList.add('show');
        
        // Update theme buttons to reflect current theme
        this.updateThemeButtons(Theme.currentTheme);
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
            if (existingItem) {
                // Show category change modal for existing item
                const result = await CategoryUI.showCategorySelectorForExistingItem(existingItem);
                
                if (result === null) {
                    // User cancelled
                    return;
                } else if (result === 'no-change') {
                    UI.showToast('이미 저장된 페이지입니다', 'info');
                    return;
                } else {
                    // Category was updated
                    UI.showToast('카테고리가 변경되었습니다', 'success');
                    await this.load();
                    this.render();
                    await CategoryUI.renderCategoryFilter();
                    return;
                }
            }

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

            const result = await Storage.add(newItem);
            UI.showToast(result.message, result.success ? 'success' : 'error');
            
            if (result.success) {
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