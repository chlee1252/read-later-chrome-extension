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
        el.textContent = `${total}개 (${unread}개 읽지않음)`;
    },

    createItemHTML(item) {
        const date = Utils.formatDate(item.addedAt);
        const readIcon = item.read ? '⟲' : '✓';
        
        return `
            <div class="item ${item.read ? 'read' : ''}" data-id="${item.id}">
                <div class="item-header">
                    <div class="item-title">
                        ${CategoryUI.renderCategoryBadge(item.categoryId).replace('data-item-id="${item.categoryId}"', `data-item-id="${item.id}"`)}
                        ${Utils.escapeHtml(item.title)}
                    </div>
                    <div class="item-actions">
                        <button class="btn-small btn-toggle" data-id="${item.id}" title="${item.read ? '읽지않음' : '읽음'}으로 표시">
                            ${readIcon}
                        </button>
                        <button class="btn-small btn-delete" data-id="${item.id}" title="삭제">
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
        document.querySelectorAll('.item').forEach(item => {
            // Item click to open URL
            item.addEventListener('click', (e) => {
                // Skip if button clicked
                if (e.target.closest('button')) return;
                
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
                btn.title = isRead ? '읽지않음으로 표시' : '읽음으로 표시';
            }
            
            // Restore transform
            item.style.transform = '';
            item.style.opacity = '';
        }, 150);
    },
};
