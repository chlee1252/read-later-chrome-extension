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
                    <span class="category-name">${window.i18n.t('all')}</span>
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
                <span class="category-name">${window.i18n.t('addCategory')}</span>
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
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${window.i18n.t('addNewCategory')}</h3>
                    <button class="btn-close">×</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>${window.i18n.t('categoryName')}</label>
                        <input type="text" id="categoryName" placeholder="${window.i18n.t('enterCategoryNamePlaceholder')}" maxlength="20">
                    </div>
                    <div class="form-group">
                        <label>${window.i18n.t('icon')}</label>
                        <div class="icon-selector">
                            ${Categories.iconOptions.map(icon => 
                                `<button type="button" class="icon-option" data-icon="${icon}">${icon}</button>`
                            ).join('')}
                        </div>
                    </div>
                    <div class="form-group">
                        <label>${window.i18n.t('color')}</label>
                        <div class="color-selector">
                            ${Categories.colorOptions.map(color => 
                                `<button type="button" class="color-option" data-color="${color}" style="background-color: ${color}"></button>`
                            ).join('')}
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="cancelCategoryBtn">${window.i18n.t('cancel')}</button>
                    <button class="btn btn-primary" id="saveCategoryBtn">${window.i18n.t('save')}</button>
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
                UI.showToast(window.i18n.t('enterCategoryName'), 'error');
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
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${window.i18n.t('changeCategory')}</h3>
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
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${window.i18n.t('selectCategory')}</h3>
                    <button class="btn-close">×</button>
                </div>
                <div class="modal-body">
                    <p class="modal-description">${window.i18n.t('selectCategoryForNewItem')}</p>
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

    async showCategorySelectorForExistingItem(existingItem) {
        const categories = await Categories.loadCategories();
        
        // Check if the item is marked as read
        if (existingItem.read) {
            return this.showReadItemOverwriteModal(existingItem, categories);
        }
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${window.i18n.t('alreadySavedPage')}</h3>
                    <button class="btn-close">×</button>
                </div>
                <div class="modal-body">
                    <p class="modal-description">${window.i18n.t('pageAlreadySaved')}</p>
                    <div class="existing-item-info">
                        <div class="item-title">${existingItem.title}</div>
                        <div class="current-category">
                            ${window.i18n.t('currentCategory')}: ${Categories.getCategoryById(await Categories.loadCategories(), existingItem.categoryId || 'uncategorized').name}
                        </div>
                    </div>
                    <p class="modal-description">${window.i18n.t('changeCategoryQuestion')}</p>
                    <div class="category-list">
                        ${categories.map(category => `
                            <button class="category-select-item ${(existingItem.categoryId || 'uncategorized') === category.id ? 'selected' : ''}" 
                                    data-category="${category.id}"
                                    style="--category-color: ${category.color};">
                                <span class="category-color-dot" style="background-color: ${category.color};"></span>
                                <span class="category-icon">${category.icon}</span>
                                <span class="category-name">${category.name}</span>
                                ${(existingItem.categoryId || 'uncategorized') === category.id ? '<span class="check-icon">✓</span>' : ''}
                            </button>
                        `).join('')}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="cancelBtn">${window.i18n.t('cancel')}</button>
                    <button class="btn btn-primary" id="updateCategoryBtn">${window.i18n.t('changeCategory')}</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        let selectedCategoryId = existingItem.categoryId || 'uncategorized';

        return new Promise((resolve) => {
            // Close button event listener
            modal.querySelector('.btn-close').addEventListener('click', () => {
                modal.remove();
                resolve(null); // User cancelled
            });

            // Cancel button
            modal.querySelector('#cancelBtn').addEventListener('click', () => {
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
                btn.addEventListener('click', () => {
                    // Remove selected class from all buttons
                    modal.querySelectorAll('.category-select-item').forEach(b => {
                        b.classList.remove('selected');
                        const checkIcon = b.querySelector('.check-icon');
                        if (checkIcon) checkIcon.remove();
                    });
                    
                    // Add selected class to clicked button
                    btn.classList.add('selected');
                    btn.insertAdjacentHTML('beforeend', '<span class="check-icon">✓</span>');
                    selectedCategoryId = btn.dataset.category;
                });
            });

            // Update category button
            modal.querySelector('#updateCategoryBtn').addEventListener('click', async () => {
                if (selectedCategoryId === (existingItem.categoryId || 'uncategorized')) {
                    modal.remove();
                    resolve('no-change'); // No change needed
                    return;
                }

                const result = await Storage.updateItemCategory(existingItem.id, selectedCategoryId);
                modal.remove();
                resolve(result.success ? selectedCategoryId : null);
            });
        });
    },

    async showReadItemOverwriteModal(existingItem, categories) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        
        // Use defensive check for i18n object
        const i18n = window.i18n && typeof window.i18n.t === 'function' ? window.i18n : {
            t: (key) => {
                // Fallback text if i18n is not available
                const fallbacks = {
                    'alreadyReadPage': 'Already Read Page',
                    'currentCategory': 'Current Category',
                    'markedAsRead': 'Marked as Read',
                    'pageAlreadyMarkedRead': 'This page is already marked as read.',
                    'whatWouldYouLike': 'What would you like to do?',
                    'saveNew': 'Save as New',
                    'saveNewDescription': 'Delete existing item and save as new "unread" item',
                    'cancel': 'Cancel',
                    'changeCategoryOnly': 'Change Category Only'
                };
                return fallbacks[key] || key;
            }
        };
        
        const categoryObj = Categories.getCategoryById(categories, existingItem.categoryId || 'uncategorized');
        const categoryName = categoryObj ? categoryObj.name : i18n.t('uncategorized');
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${i18n.t('alreadyReadPage')}</h3>
                    <button class="btn-close">×</button>
                </div>
                <div class="modal-body">
                    <div class="existing-item-info read-item">
                        <div class="item-title">
                            <span class="read-status">✓</span>
                            ${existingItem.title}
                        </div>
                        <div class="current-category">
                            ${i18n.t('currentCategory')}: ${categoryName}
                        </div>
                        <div class="read-date">
                            ${i18n.t('markedAsRead')}
                        </div>
                    </div>
                    <p class="modal-description warning">${i18n.t('pageAlreadyMarkedRead')}</p>
                    <p class="modal-description">${i18n.t('whatWouldYouLike')}</p>
                    <p class="modal-description small-text">
                        <strong>${i18n.t('saveNew')}:</strong> ${i18n.t('saveNewDescription')}
                    </p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="cancelBtn">${i18n.t('cancel')}</button>
                    <button class="btn btn-warning" id="overwriteBtn">${i18n.t('saveNew')}</button>
                    <button class="btn btn-primary" id="changeCategoryBtn">${i18n.t('changeCategoryOnly')}</button>
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

            // Cancel button
            modal.querySelector('#cancelBtn').addEventListener('click', () => {
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

            // Overwrite button - save as new item
            modal.querySelector('#overwriteBtn').addEventListener('click', async () => {
                modal.remove();
                resolve('overwrite'); // Signal to create new item
            });

            // Change category button - show category selector for read item
            modal.querySelector('#changeCategoryBtn').addEventListener('click', async () => {
                modal.remove();
                // Show regular category selector for the existing item
                const categoryResult = await this.showRegularCategorySelectorForExistingItem(existingItem, categories);
                resolve(categoryResult);
            });
        });
    },

    async showRegularCategorySelectorForExistingItem(existingItem, categories) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${window.i18n.t('changeCategory')}</h3>
                    <button class="btn-close">×</button>
                </div>
                <div class="modal-body">
                    <div class="existing-item-info">
                        <div class="item-title">${existingItem.title}</div>
                        <div class="current-category">
                            ${window.i18n.t('currentCategory')}: ${Categories.getCategoryById(categories, existingItem.categoryId || 'uncategorized').name}
                        </div>
                    </div>
                    <p class="modal-description">${window.i18n.t('selectNewCategory')}:</p>
                    <div class="category-list">
                        ${categories.map(category => `
                            <button class="category-select-item ${(existingItem.categoryId || 'uncategorized') === category.id ? 'selected' : ''}" 
                                    data-category="${category.id}"
                                    style="--category-color: ${category.color};">
                                <span class="category-color-dot" style="background-color: ${category.color};"></span>
                                <span class="category-icon">${category.icon}</span>
                                <span class="category-name">${category.name}</span>
                                ${(existingItem.categoryId || 'uncategorized') === category.id ? '<span class="check-icon">✓</span>' : ''}
                            </button>
                        `).join('')}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="cancelBtn">${window.i18n.t('cancel')}</button>
                    <button class="btn btn-primary" id="updateCategoryBtn">${window.i18n.t('changeCategory')}</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        let selectedCategoryId = existingItem.categoryId || 'uncategorized';

        return new Promise((resolve) => {
            // Close button event listener
            modal.querySelector('.btn-close').addEventListener('click', () => {
                modal.remove();
                resolve(null); // User cancelled
            });

            // Cancel button
            modal.querySelector('#cancelBtn').addEventListener('click', () => {
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
                btn.addEventListener('click', () => {
                    // Remove selected class from all buttons
                    modal.querySelectorAll('.category-select-item').forEach(b => {
                        b.classList.remove('selected');
                        const checkIcon = b.querySelector('.check-icon');
                        if (checkIcon) checkIcon.remove();
                    });
                    
                    // Add selected class to clicked button
                    btn.classList.add('selected');
                    btn.insertAdjacentHTML('beforeend', '<span class="check-icon">✓</span>');
                    selectedCategoryId = btn.dataset.category;
                });
            });

            // Update category button
            modal.querySelector('#updateCategoryBtn').addEventListener('click', async () => {
                if (selectedCategoryId === (existingItem.categoryId || 'uncategorized')) {
                    modal.remove();
                    resolve('no-change'); // No change needed
                    return;
                }

                const result = await Storage.updateItemCategory(existingItem.id, selectedCategoryId);
                modal.remove();
                resolve(result.success ? selectedCategoryId : null);
            });
        });
    },

    renderCategoryBadge(categoryId, itemId) {
        if (!categoryId || categoryId === 'uncategorized') {
            // Show add category button when no category is assigned
            return `<span class="category-badge category-add" data-category="uncategorized" data-item-id="${itemId}" title="${window.i18n.t('clickToAddCategory')}">
                <span class="category-icon">+</span>
                <span class="category-name">${window.i18n.t('addCategory')}</span>
            </span>`;
        }

        return `<span class="category-badge" data-category="${categoryId}" data-item-id="${itemId}"></span>`;
    },

    async updateCategoryBadges() {
        const categories = await Categories.loadCategories();
        const badges = document.querySelectorAll('.category-badge[data-category]');
        
        console.log('Updating category badges, found:', badges.length);
        
        badges.forEach(badge => {
            const categoryId = badge.dataset.category;
            const itemId = badge.dataset.itemId;
            
            console.log('Processing badge:', categoryId, itemId);
            
            // Handle add category button
            if (categoryId === 'uncategorized' || !categoryId) {
                badge.classList.add('category-add');
                badge.innerHTML = `<span class="category-icon">+</span><span class="category-name">${window.i18n.t('addCategory')}</span>`;
                badge.title = window.i18n.t('clickToAddCategory');
                return;
            }
            
            // Handle existing category badge
            const category = Categories.getCategoryById(categories, categoryId);
            if (!category) {
                console.log('Category not found:', categoryId);
                return;
            }
            
            // Set content with proper spacing
            badge.innerHTML = `<span class="category-icon">${category.icon}</span><span class="category-name">${category.name}</span>`;
            badge.style.color = category.color;
            badge.style.borderColor = category.color;
            badge.style.backgroundColor = `${category.color}15`; // Add slight color tint
            badge.title = `${window.i18n.t('category')}: ${category.name}\n${window.i18n.t('clickToChangeCategory')}`;
        });
    }
};
