// UI management
const UI = {
    showToast(message, type = 'success') {
        // Remove existing toast
        document.querySelectorAll('.toast').forEach(t => t.remove());
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        // Show with animation
        setTimeout(() => toast.classList.add('show'), 10);
        
        // Hide after 2 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    },

    updateCount(total, unread) {
        const el = document.getElementById('count');
        el.textContent = window.i18n.t('itemCount', { total, unread });
    },

    createItemHTML(item) {
        const date = Utils.formatDate(item.addedAt);
        const readIcon = item.read ? '⟲' : '✓';
        
        return `
            <div class="item ${item.read ? 'read' : ''}" data-id="${item.id}">
                <div class="item-header">
                    <div class="item-content">
                        <div class="item-category">
                            ${CategoryUI.renderCategoryBadge(item.categoryId, item.id)}
                        </div>
                        <div class="item-title">
                            ${Utils.escapeHtml(item.title)}
                        </div>
                    </div>
                    <div class="item-actions">
                        <button class="btn-small btn-toggle" data-id="${item.id}" title="${item.read ? window.i18n.t('markAsUnread') : window.i18n.t('markAsRead')}">
                            ${readIcon}
                        </button>
                        <button class="btn-small btn-delete" data-id="${item.id}" title="${window.i18n.t('delete')}">
                            ✕
                        </button>
                    </div>
                </div>
                <div class="item-url" title="${Utils.escapeHtml(item.url)}">${Utils.escapeHtml(Utils.truncateUrl(item.url))}</div>
                <div class="item-date">${date}</div>
            </div>
        `;
    },

    renderList(items) {
        const container = document.getElementById('list');
        const empty = document.getElementById('empty');
        
        if (items.length === 0) {
            container.innerHTML = '';
            empty.style.display = 'block';
            return;
        }
        
        empty.style.display = 'none';
        
        // Sort: unread first, then by date
        const sorted = [...items].sort((a, b) => {
            if (a.read === b.read) {
                return new Date(b.addedAt) - new Date(a.addedAt);
            }
            return a.read - b.read;
        });
        
        container.innerHTML = sorted.map(item => this.createItemHTML(item)).join('');
        
        // Add click handlers
        this.attachEvents();
        
        // Update category badges
        CategoryUI.updateCategoryBadges();
    },

    attachEvents() {
        // Remove existing event listeners first
        const existingHandler = document.querySelector('#list')._categoryClickHandler;
        if (existingHandler) {
            document.querySelector('#list').removeEventListener('click', existingHandler);
        }

        document.querySelectorAll('.item').forEach(item => {
            // Item click to open URL
            item.addEventListener('click', (e) => {
                // Skip if button clicked or category badge clicked
                if (e.target.closest('button') || e.target.closest('.category-badge')) return;
                
                const url = item.querySelector('.item-url').getAttribute('title');
                chrome.tabs.create({ url });
            });
        });

        // Button event listeners
        document.querySelectorAll('.btn-toggle').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.getAttribute('data-id');
                if (window.App && window.App.toggleRead) {
                    window.App.toggleRead(id);
                }
            });
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.getAttribute('data-id');
                if (window.App && window.App.deleteItem) {
                    window.App.deleteItem(id);
                }
            });
        });

        // Category badge event delegation on the list container
        const listContainer = document.querySelector('#list');
        const categoryClickHandler = async (e) => {
            const categoryBadge = e.target.closest('.category-badge');
            if (categoryBadge) {
                e.stopPropagation();
                e.preventDefault();
                
                const itemId = categoryBadge.dataset.itemId;
                console.log('Category badge clicked via delegation for item:', itemId);
                
                if (itemId) {
                    try {
                        // Add loading state
                        categoryBadge.classList.add('loading');
                        const originalContent = categoryBadge.innerHTML;
                        categoryBadge.innerHTML = `<span class="category-icon">⏳</span><span class="category-name">${window.i18n.t('changing')}</span>`;
                        
                        await CategoryUI.showCategorySelector(itemId);
                        
                        // Remove loading state and refresh the list
                        categoryBadge.classList.remove('loading');
                    } catch (error) {
                        console.error('Error showing category selector:', error);
                        UI.showToast(window.i18n.t('categoryChangeFailed'), 'error');
                        categoryBadge.classList.remove('loading');
                    }
                }
            }
        };
        
        listContainer.addEventListener('click', categoryClickHandler);
        listContainer._categoryClickHandler = categoryClickHandler; // Store reference for cleanup
    },

    filterItems(searchTerm) {
        const items = document.querySelectorAll('.item');
        const term = searchTerm.toLowerCase().trim();
        
        items.forEach(item => {
            const title = item.querySelector('.item-title').textContent.toLowerCase();
            const url = item.querySelector('.item-url').textContent.toLowerCase();
            
            const visible = !term || title.includes(term) || url.includes(term);
            item.style.display = visible ? 'block' : 'none';
        });
    },

    // Animate read state change
    animateReadToggle(itemId, isRead) {
        const item = document.querySelector(`[data-id="${itemId}"]`);
        if (!item) return;

        // Add animation class
        item.style.transform = 'scale(0.95)';
        item.style.opacity = '0.7';
        
        setTimeout(() => {
            // Update classes
            if (isRead) {
                item.classList.add('read');
            } else {
                item.classList.remove('read');
            }
            
            // Update button icon with new logic: read items show ⟲ (refresh/undo), unread items show ✓ (check)
            const btn = item.querySelector('.btn-toggle');
            if (btn) {
                btn.textContent = isRead ? '⟲' : '✓';
                btn.title = isRead ? window.i18n.t('markAsUnread') : window.i18n.t('markAsRead');
            }
            
            // Restore transform
            item.style.transform = '';
            item.style.opacity = '';
        }, 150);
    },
};
