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
            return { success: false, message: window.i18n.t('alreadySaved') };
        }

        // Add default category if not specified
        if (!item.categoryId) {
            item.categoryId = 'uncategorized';
        }

        items.unshift(item);
        const saved = await this.save(items);
        
        return { 
            success: saved, 
            message: saved ? window.i18n.t('saved') : window.i18n.t('saveFailed') 
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
                message: saved ? window.i18n.t('categoryChanged') : window.i18n.t('categoryChangeFailed')
            };
        }
        
        return { success: false, message: window.i18n.t('itemNotFound') };
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
            message: saved ? window.i18n.t('deleted') : window.i18n.t('deleteFailed') 
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
                message: saved ? (item.read ? window.i18n.t('markedAsRead') : window.i18n.t('markedAsUnread')) : window.i18n.t('updateFailed')
            };
        }
        
        return { success: false, message: window.i18n.t('itemNotFound') };
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
            return { cleaned: 0, message: window.i18n.t('autoDeleteDisabled') };
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
                message: saved ? window.i18n.t('autoDeleteCompleted', { count: deletedCount }) : window.i18n.t('autoDeleteError')
            };
        }
        
        return { cleaned: 0, success: true, message: window.i18n.t('autoDeleteNoItems') };
    },

    async setReminder(id, reminderData) {
        const items = await this.load();
        const item = items.find(i => i.id === id);
        
        if (item) {
            item.reminder = reminderData;
            const saved = await this.save(items);
            return { 
                success: saved, 
                message: saved ? window.i18n.t('reminderSet') : window.i18n.t('reminderError') 
            };
        }
        
        return { success: false, message: window.i18n.t('itemNotFound') };
    },

    async removeReminder(id) {
        const items = await this.load();
        const item = items.find(i => i.id === id);
        
        if (item && item.reminder) {
            delete item.reminder;
            const saved = await this.save(items);
            return { 
                success: saved, 
                message: saved ? window.i18n.t('reminderRemoved') : window.i18n.t('reminderError') 
            };
        }
        
        return { success: false, message: window.i18n.t('reminderNotFound') };
    },

    async getItemsWithReminders() {
        const items = await this.load();
        return items.filter(item => item.reminder);
    }
};
