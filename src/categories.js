// Category management system
const Categories = {
    // Default categories
    getDefaultCategories() {
        return [
            { 
                id: 'uncategorized', 
                name: window.i18n && window.i18n.t ? window.i18n.t('uncategorized') : '미분류', 
                color: '#6c757d', 
                icon: '📄' 
            }
        ];
    },
    
    // Maximum number of categories allowed
    maxCategories: 6,

    async loadCategories() {
        try {
            const result = await chrome.storage.local.get(['categories']);
            const defaultCategories = this.getDefaultCategories();
            const categories = result.categories || defaultCategories;
            
            // Ensure default categories exist
            const existingIds = categories.map(c => c.id);
            const missingDefaults = defaultCategories.filter(def => !existingIds.includes(def.id));
            
            if (missingDefaults.length > 0) {
                const updatedCategories = [...categories, ...missingDefaults];
                await this.saveCategories(updatedCategories);
                return updatedCategories;
            }
            
            // Update uncategorized name if it exists
            const uncategorizedIndex = categories.findIndex(c => c.id === 'uncategorized');
            if (uncategorizedIndex !== -1) {
                categories[uncategorizedIndex].name = window.i18n && window.i18n.t ? window.i18n.t('uncategorized') : '미분류';
            }
            
            return categories;
        } catch (error) {
            console.error('Error loading categories:', error);
            return this.getDefaultCategories();
        }
    },

    async saveCategories(categories) {
        try {
            await chrome.storage.local.set({ categories });
            return true;
        } catch (error) {
            console.error('Error saving categories:', error);
            return false;
        }
    },

    async addCategory(category) {
        const categories = await this.loadCategories();
        
        // Check if we've reached the category limit (exclude uncategorized from count)
        const customCategories = categories.filter(c => c.id !== 'uncategorized');
        if (customCategories.length >= this.maxCategories - 1) {
            return { success: false, message: `최대 ${this.maxCategories}개의 카테고리만 만들 수 있습니다` };
        }
        
        // Check for duplicate name
        if (categories.some(c => c.name === category.name)) {
            return { success: false, message: '이미 존재하는 카테고리명입니다' };
        }

        const newCategory = {
            id: Date.now().toString(),
            name: category.name,
            color: category.color || '#6c757d',
            icon: category.icon || '📁',
            createdAt: new Date().toISOString()
        };

        categories.push(newCategory);
        const saved = await this.saveCategories(categories);
        
        return { 
            success: saved, 
            category: newCategory,
            message: saved ? '카테고리가 추가되었습니다' : '카테고리 추가 실패' 
        };
    },

    async updateCategory(id, updates) {
        const categories = await this.loadCategories();
        const categoryIndex = categories.findIndex(c => c.id === id);
        
        if (categoryIndex === -1) {
            return { success: false, message: '카테고리를 찾을 수 없습니다' };
        }

        // Check for duplicate name (if name is being updated)
        if (updates.name && categories.some(c => c.name === updates.name && c.id !== id)) {
            return { success: false, message: '이미 존재하는 카테고리명입니다' };
        }

        categories[categoryIndex] = { ...categories[categoryIndex], ...updates };
        const saved = await this.saveCategories(categories);
        
        return { 
            success: saved, 
            category: categories[categoryIndex],
            message: saved ? '카테고리가 수정되었습니다' : '카테고리 수정 실패' 
        };
    },

    async deleteCategory(id) {
        // Cannot delete default categories
        const defaultCategories = this.getDefaultCategories();
        if (defaultCategories.some(def => def.id === id)) {
            return { success: false, message: '기본 카테고리는 삭제할 수 없습니다' };
        }

        const categories = await this.loadCategories();
        const filtered = categories.filter(c => c.id !== id);
        
        // Move items from deleted category to uncategorized
        const items = await Storage.load();
        const updatedItems = items.map(item => {
            if (item.categoryId === id) {
                return { ...item, categoryId: 'uncategorized' };
            }
            return item;
        });
        
        await Storage.save(updatedItems);
        const saved = await this.saveCategories(filtered);
        
        return { 
            success: saved, 
            message: saved ? '카테고리가 삭제되었습니다' : '카테고리 삭제 실패' 
        };
    },

    async getCategoryStats() {
        const [categories, items] = await Promise.all([
            this.loadCategories(),
            Storage.load()
        ]);

        return categories.map(category => {
            const categoryItems = items.filter(item => (item.categoryId || 'uncategorized') === category.id);
            const unreadCount = categoryItems.filter(item => !item.read).length;
            
            return {
                ...category,
                totalCount: categoryItems.length,
                unreadCount
            };
        });
    },

    getCategoryById(categories, id) {
        return categories.find(c => c.id === id) || this.getDefaultCategories()[0];
    },

    // Predefined color options for categories
    colorOptions: [
        '#6c757d', '#007bff', '#28a745', '#dc3545', 
        '#fd7e14', '#6f42c1', '#20c997', '#e83e8c',
        '#ffc107', '#17a2b8', '#6610f2', '#e74c3c'
    ],

    // Predefined icon options for categories
    iconOptions: [
        '📁', '📄', '💼', '📚', '📰', '🎬', '💻', '🏠',
        '🛍️', '🎨', '🔬', '📈', '🏥', '✈️', '🍽️', '🎮'
    ]
};
