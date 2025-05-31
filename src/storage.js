// Storage management
const Storage = {
    async load() {
        try {
            const result = await chrome.storage.local.get(['items']);
            return result.items || [];
        } catch (error) {
            console.error('Error loading:', error);
            return [];
        }
    },

    async save(items) {
        try {
            await chrome.storage.local.set({ items });
            return true;
        } catch (error) {
            console.error('Error saving:', error);
            return false;
        }
    },

    async add(item) {
        const items = await this.load();
        
        // Check duplicate
        if (items.some(i => i.url === item.url)) {
            return { success: false, message: '이미 저장된 페이지입니다' };
        }

        // Add default category if not specified
        if (!item.categoryId) {
            item.categoryId = 'uncategorized';
        }

        items.unshift(item);
        const saved = await this.save(items);
        
        return { 
            success: saved, 
            message: saved ? '저장되었습니다' : '저장 실패' 
        };
    },

    async updateItemCategory(id, categoryId) {
        const items = await this.load();
        const item = items.find(i => i.id === id);
        
        if (item) {
            item.categoryId = categoryId;
            const saved = await this.save(items);
            return { 
                success: saved, 
                message: saved ? '카테고리가 변경되었습니다' : '카테고리 변경 실패'
            };
        }
        
        return { success: false, message: '항목을 찾을 수 없습니다' };
    },

    async getItemsByCategory(categoryId) {
        const items = await this.load();
        return items.filter(item => (item.categoryId || 'uncategorized') === categoryId);
    },

    async remove(id) {
        const items = await this.load();
        const filtered = items.filter(i => i.id !== id);
        const saved = await this.save(filtered);
        
        return { 
            success: saved,
            message: saved ? '삭제되었습니다' : '삭제 실패' 
        };
    },

    async toggleRead(id) {
        const items = await this.load();
        const item = items.find(i => i.id === id);
        
        if (item) {
            item.read = !item.read;
            const saved = await this.save(items);
            return { 
                success: saved, 
                read: item.read,
                message: saved ? `${item.read ? '읽음' : '읽지않음'}으로 표시` : '업데이트 실패'
            };
        }
        
        return { success: false, message: '항목을 찾을 수 없습니다' };
    }
};
