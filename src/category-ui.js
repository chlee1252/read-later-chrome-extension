// Category UI management
const CategoryUI = {
    currentFilter: 'all', // 'all' or specific category id
    isEditMode: false,

    async renderCategoryFilter() {
        const categories = await Categories.getCategoryStats();
        const container = document.getElementById('categoryFilter');
        
        if (!container) return;

        const totalItems = categories.reduce((sum, cat) => sum + cat.totalCount, 0);
        const totalUnread = categories.reduce((sum, cat) => sum + cat.unreadCount, 0);

        let html = `
            <div class="category-filter">
                <button class="category-btn ${this.currentFilter === 'all' ? 'active' : ''}" 
                        data-category="all">
                    <span class="category-icon">📋</span>
                    <span class="category-name">전체</span>
                    <span class="category-count">${totalItems}</span>
                    ${totalUnread > 0 ? `<span class="unread-badge">${totalUnread}</span>` : ''}
                </button>
        `;

        categories.forEach(category => {
            html += `
                <button class="category-btn ${this.currentFilter === category.id ? 'active' : ''}" 
                        data-category="${category.id}"
                        style="--category-color: ${category.color};">
                    <span class="category-icon">${category.icon}</span>
                    <span class="category-name">${category.name}</span>
                    <span class="category-count">${category.totalCount}</span>
                    ${category.unreadCount > 0 ? `<span class="unread-badge">${category.unreadCount}</span>` : ''}
                </button>
            `;
        });

        html += `
            <button class="category-btn category-add-btn" id="addCategoryBtn">
                <span class="category-icon">+</span>
                <span class="category-name">카테고리 추가</span>
            </button>
        `;

        container.innerHTML = html;
        this.attachCategoryEvents();
    },

    attachCategoryEvents() {
        // Category filter buttons
        document.querySelectorAll('.category-btn[data-category]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const categoryId = btn.dataset.category;
                this.filterByCategory(categoryId);
            });
        });

        // Add category button
        const addBtn = document.getElementById('addCategoryBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showAddCategoryModal());
        }
    },

    async filterByCategory(categoryId) {
        this.currentFilter = categoryId;
        
        // Update active button
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-category="${categoryId}"]`)?.classList.add('active');

        // Filter and render items
        let items;
        if (categoryId === 'all') {
            items = await Storage.load();
        } else {
            items = await Storage.getItemsByCategory(categoryId);
        }

        UI.renderList(items);
    },

    showAddCategoryModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3>새 카테고리 추가</h3>
                    <button class="btn-close">×</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>카테고리 이름</label>
                        <input type="text" id="categoryName" placeholder="카테고리 이름을 입력하세요" maxlength="20">
                    </div>
                    <div class="form-group">
                        <label>아이콘</label>
                        <div class="icon-selector">
                            ${Categories.iconOptions.map(icon => 
                                `<button type="button" class="icon-option" data-icon="${icon}">${icon}</button>`
                            ).join('')}
                        </div>
                    </div>
                    <div class="form-group">
                        <label>색상</label>
                        <div class="color-selector">
                            ${Categories.colorOptions.map(color => 
                                `<button type="button" class="color-option" data-color="${color}" style="background-color: ${color}"></button>`
                            ).join('')}
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="cancelCategoryBtn">취소</button>
                    <button class="btn btn-primary" id="saveCategoryBtn">저장</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        let selectedIcon = '📁';
        let selectedColor = '#6c757d';

        // Icon selection
        modal.querySelectorAll('.icon-option').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.querySelectorAll('.icon-option').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                selectedIcon = btn.dataset.icon;
            });
        });

        // Color selection
        modal.querySelectorAll('.color-option').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.querySelectorAll('.color-option').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                selectedColor = btn.dataset.color;
            });
        });

        // Set default selections
        modal.querySelector('.icon-option').classList.add('selected');
        modal.querySelector('.color-option').classList.add('selected');

        // Close button event listeners
        modal.querySelector('.btn-close').addEventListener('click', () => {
            modal.remove();
        });

        modal.querySelector('#cancelCategoryBtn').addEventListener('click', () => {
            modal.remove();
        });

        // Save button
        modal.querySelector('#saveCategoryBtn').addEventListener('click', async () => {
            const name = modal.querySelector('#categoryName').value.trim();
            
            if (!name) {
                UI.showToast('카테고리 이름을 입력해주세요', 'error');
                return;
            }

            const result = await Categories.addCategory({
                name,
                icon: selectedIcon,
                color: selectedColor
            });

            UI.showToast(result.message, result.success ? 'success' : 'error');
            
            if (result.success) {
                modal.remove();
                await this.renderCategoryFilter();
            }
        });

        // Focus name input
        modal.querySelector('#categoryName').focus();
    },

    async showCategorySelector(itemId) {
        const categories = await Categories.loadCategories();
        const items = await Storage.load();
        const item = items.find(i => i.id === itemId);
        
        if (!item) return;

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3>카테고리 변경</h3>
                    <button class="btn-close">×</button>
                </div>
                <div class="modal-body">
                    <div class="category-list">
                        ${categories.map(category => `
                            <button class="category-select-item ${(item.categoryId || 'uncategorized') === category.id ? 'selected' : ''}" 
                                    data-category="${category.id}">
                                <span class="category-icon">${category.icon}</span>
                                <span class="category-name">${category.name}</span>
                                ${(item.categoryId || 'uncategorized') === category.id ? '<span class="check-icon">✓</span>' : ''}
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Close button event listener
        modal.querySelector('.btn-close').addEventListener('click', () => {
            modal.remove();
        });

        // Category selection
        modal.querySelectorAll('.category-select-item').forEach(btn => {
            btn.addEventListener('click', async () => {
                const categoryId = btn.dataset.category;
                
                const result = await Storage.updateItemCategory(itemId, categoryId);
                UI.showToast(result.message, result.success ? 'success' : 'error');
                
                if (result.success) {
                    modal.remove();
                    await window.App.load();
                    window.App.render();
                    await this.renderCategoryFilter();
                }
            });
        });
    },

    async showCategorySelectorForNewItem(item) {
        const categories = await Categories.loadCategories();
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3>카테고리 선택</h3>
                    <button class="btn-close">×</button>
                </div>
                <div class="modal-body">
                    <p class="modal-description">새 항목을 어느 카테고리에 저장하시겠습니까?</p>
                    <div class="category-list">
                        ${categories.map(category => `
                            <button class="category-select-item" 
                                    data-category="${category.id}"
                                    style="--category-color: ${category.color};">
                                <span class="category-color-dot" style="background-color: ${category.color};"></span>
                                <span class="category-icon">${category.icon}</span>
                                <span class="category-name">${category.name}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        return new Promise((resolve) => {
            // Close button event listener
            modal.querySelector('.btn-close').addEventListener('click', () => {
                modal.remove();
                resolve(null); // User cancelled
            });

            // Click outside to close
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                    resolve(null); // User cancelled
                }
            });

            // Category selection
            modal.querySelectorAll('.category-select-item').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const categoryId = btn.dataset.category;
                    modal.remove();
                    resolve(categoryId);
                });
            });
        });
    },

    renderCategoryBadge(categoryId) {
        if (!categoryId || categoryId === 'uncategorized') {
            return '';
        }

        return `<span class="category-badge" data-category="${categoryId}" data-item-id="${categoryId}"></span>`;
    },

    async updateCategoryBadges() {
        const categories = await Categories.loadCategories();
        const badges = document.querySelectorAll('.category-badge[data-category]');
        
        badges.forEach(badge => {
            const categoryId = badge.dataset.category;
            const category = Categories.getCategoryById(categories, categoryId);
            const itemId = badge.dataset.itemId;
            
            badge.innerHTML = `${category.icon} <span>${category.name}</span>`;
            badge.style.color = category.color;
            badge.style.borderColor = category.color;
            badge.style.backgroundColor = `${category.color}10`; // Add slight color tint
            badge.title = `카테고리: ${category.name}`;
            
            // Add event listener to open category selector
            badge.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showCategorySelector(itemId);
            });
        });
    }
};
