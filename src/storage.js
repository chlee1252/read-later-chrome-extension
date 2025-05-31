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

    async add(item, skipDuplicateCheck = false) {
        const items = await this.load();
        
        // Check duplicate unless explicitly skipped
        if (!skipDuplicateCheck && items.some(i => i.url === item.url)) {
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

    async findItemByUrl(url) {
        const items = await this.load();
        return items.find(item => item.url === url);
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
            // 읽음으로 표시할 때 타임스탬프 기록, 읽지않음으로 바꿀 때는 제거
            if (item.read) {
                item.readAt = new Date().toISOString();
            } else {
                delete item.readAt;
            }
            
            const saved = await this.save(items);
            return { 
                success: saved, 
                read: item.read,
                message: saved ? `${item.read ? '읽음' : '읽지않음'}으로 표시` : '업데이트 실패'
            };
        }
        
        return { success: false, message: '항목을 찾을 수 없습니다' };
    },

    // 자동 삭제 설정 관리
    async getAutoDeleteSettings() {
        try {
            const result = await chrome.storage.local.get(['autoDeleteSettings']);
            return result.autoDeleteSettings || {
                enabled: false,
                value: 30,
                unit: 'days' // 'minutes', 'hours', 'days'
            };
        } catch (error) {
            console.error('Error loading auto-delete settings:', error);
            return { enabled: false, value: 30, unit: 'days' };
        }
    },

    async setAutoDeleteSettings(settings) {
        try {
            await chrome.storage.local.set({ autoDeleteSettings: settings });
            return true;
        } catch (error) {
            console.error('Error saving auto-delete settings:', error);
            return false;
        }
    },

    // 자동 삭제 실행
    async cleanupReadItems() {
        const settings = await this.getAutoDeleteSettings();
        if (!settings.enabled) {
            return { cleaned: 0, message: '자동 삭제가 비활성화되어 있습니다' };
        }

        const items = await this.load();
        const now = new Date();
        
        // 시간 단위에 따라 cutoff 시간 계산
        let milliseconds;
        switch (settings.unit) {
            case 'minutes':
                milliseconds = settings.value * 60 * 1000;
                break;
            case 'hours':
                milliseconds = settings.value * 60 * 60 * 1000;
                break;
            case 'days':
            default:
                milliseconds = settings.value * 24 * 60 * 60 * 1000;
                break;
        }
        
        const cutoffDate = new Date(now.getTime() - milliseconds);
        
        const itemsToKeep = items.filter(item => {
            // 읽지않은 항목은 유지
            if (!item.read) return true;
            
            // readAt이 없는 경우 유지 (이전 버전 호환성)
            if (!item.readAt) return true;
            
            // 읽은 날짜가 cutoff 이후인 경우 유지
            const readDate = new Date(item.readAt);
            return readDate > cutoffDate;
        });

        const deletedCount = items.length - itemsToKeep.length;
        
        if (deletedCount > 0) {
            const saved = await this.save(itemsToKeep);
            return {
                cleaned: deletedCount,
                success: saved,
                message: saved ? `${deletedCount}개 항목이 자동 삭제되었습니다` : '자동 삭제 중 오류 발생'
            };
        }
        
        return { cleaned: 0, success: true, message: '삭제할 항목이 없습니다' };
    }
};
