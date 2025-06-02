// Enhanced background service worker for Read-Later extension
class ReadLaterBackground {
    constructor() {
        this.init();
    }

    init() {
        // Extension installation and initialization
        chrome.runtime.onInstalled.addListener(() => {
            console.log('🚀 Read-Later extension installed/updated');
            this.initializeStorage();
            this.setupContextMenu();
            this.updateBadge();
            this.setupAutoDeleteScheduler();
        });
        
        // Set up notification handlers on every service worker start
        this.setupNotificationHandlers();

        // Storage change detection for real-time badge updates
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'local' && changes.items) {
                this.updateBadge();
                console.log('📚 Reading list updated, badge refreshed');
            }
        });

        // Context menu click handling
        chrome.contextMenus.onClicked.addListener((info, tab) => {
            this.handleContextMenuClick(info, tab);
        });

        // Action button click handling (for browsers without popup support)
        chrome.action.onClicked.addListener((tab) => {
            this.addCurrentPageToList(tab);
        });

        // 알람 이벤트 리스너 (자동 삭제 및 리마인더용)
        chrome.alarms.onAlarm.addListener((alarm) => {
            if (alarm.name === 'autoCleanup') {
                this.runAutoCleanup();
            } else if (alarm.name.startsWith('reminder_')) {
                this.handleReminderAlarm(alarm);
            }
        });

        // 시작 시 한 번 자동 삭제 실행
        this.runAutoCleanup();

        // 메시지 핸들러 추가
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.action === 'updateAutoDeleteScheduler') {
                // 현재 인스턴스의 스케줄러 재설정
                this.setupAutoDeleteScheduler().then(() => {
                    sendResponse({ success: true });
                }).catch((error) => {
                    console.error('❌ Error updating auto-delete scheduler:', error);
                    sendResponse({ success: false, error: error.message });
                });
                return true; // 비동기 응답을 위해 true 반환
            }
        });
    }

    // 자동 삭제 스케줄러 설정
    async setupAutoDeleteScheduler() {
        try {
            const Storage = await this.loadStorageModule();
            const settings = await Storage.getAutoDeleteSettings();
            
            // 기존 알람 제거
            await chrome.alarms.clear('autoCleanup');
            
            if (!settings.enabled) {
                console.log('🔄 Auto-delete disabled, scheduler cleared');
                return;
            }
            
            // 사용자 설정에 따라 알람 주기 계산
            let periodInMinutes;
            switch (settings.unit) {
                case 'minutes':
                    periodInMinutes = Math.max(1, settings.value); // 최소 1분
                    break;
                case 'hours':
                    periodInMinutes = settings.value * 60;
                    break;
                case 'days':
                    periodInMinutes = settings.value * 60 * 24;
                    break;
                default:
                    periodInMinutes = 60; // 기본값: 1시간
            }
            
            // 알람 생성
            await chrome.alarms.create('autoCleanup', { 
                delayInMinutes: 1, // 1분 후 시작
                periodInMinutes: periodInMinutes
            });
            
            console.log(`🔄 Auto-delete scheduler set up: every ${periodInMinutes} minutes (${settings.value} ${settings.unit})`);
        } catch (error) {
            console.error('❌ Error setting up auto-delete scheduler:', error);
        }
    }

    // 자동 삭제 실행
    async runAutoCleanup() {
        try {
            const Storage = await this.loadStorageModule();
            const result = await Storage.cleanupReadItems();
            
            console.log(`🧹 Auto cleanup result:`, result);
            
            if (result.cleaned > 0) {
                console.log(`🧹 Auto cleanup: ${result.cleaned} items deleted`);
                this.updateBadge();
            }
        } catch (error) {
            console.error('❌ Error running auto cleanup:', error);
        }
    }

    // Initialize storage with empty reading list if needed
    async initializeStorage() {
        try {
            const result = await chrome.storage.local.get(['items']);
            if (!result.items) {
                await chrome.storage.local.set({ items: [] });
                console.log('📋 Initialized empty reading list');
            }
        } catch (error) {
            console.error('❌ Error initializing storage:', error);
        }
    }

    setupContextMenu() {
        // Remove existing menus
        chrome.contextMenus.removeAll(() => {
            // Page context menu
            chrome.contextMenus.create({
                id: 'addToReadingList',
                title: 'Add to Reading List',
                contexts: ['page']
            });

            // Link context menu
            chrome.contextMenus.create({
                id: 'addLinkToReadingList',
                title: 'Add Link to Reading List',
                contexts: ['link']
            });

            // Separator
            chrome.contextMenus.create({
                id: 'separator',
                type: 'separator',
                contexts: ['page', 'link']
            });

            // View reading list
            chrome.contextMenus.create({
                id: 'viewReadingList',
                title: 'View Reading List',
                contexts: ['page', 'link']
            });
        });
    }

    async handleContextMenuClick(info, tab) {
        switch (info.menuItemId) {
            case 'addToReadingList':
                await this.addCurrentPageToList(tab);
                break;
            case 'addLinkToReadingList':
                await this.addLinkToList(info.linkUrl, tab);
                break;
            case 'viewReadingList':
                await this.openReadingList();
                break;
        }
    }

    async addCurrentPageToList(tab) {
        try {
            // Check for invalid pages
            if (!tab.url || this.isRestrictedUrl(tab.url)) {
                this.showNotification('This page cannot be saved.');
                return;
            }

            const result = await chrome.storage.local.get(['items']);
            const readingList = result.items || [];

            // Check for duplicates
            const exists = readingList.some(item => item.url === tab.url);
            if (exists) {
                this.showNotification('Page already saved.');
                return;
            }

            const newItem = {
                id: Date.now().toString(),
                title: tab.title || 'Untitled',
                url: tab.url,
                addedAt: new Date().toISOString(),
                read: false,
                categoryId: 'uncategorized'
            };

            readingList.unshift(newItem);
            await chrome.storage.local.set({ items: readingList });
            
            this.showNotification('Page added to reading list!');
            this.updateBadge();
        } catch (error) {
            console.error('Error adding page to reading list:', error);
            this.showNotification('Failed to save page.');
        }
    }

    async addLinkToList(linkUrl, tab) {
        try {
            const result = await chrome.storage.local.get(['items']);
            const readingList = result.items || [];

            // Check for duplicates
            const exists = readingList.some(item => item.url === linkUrl);
            if (exists) {
                this.showNotification('Link already saved.');
                return;
            }

            // Get link title by briefly loading the page
            let linkTitle = linkUrl;
            try {
                const response = await fetch(linkUrl, { method: 'HEAD' });
                if (response.ok) {
                    linkTitle = new URL(linkUrl).hostname;
                }
            } catch (e) {
                linkTitle = new URL(linkUrl).hostname;
            }

            const newItem = {
                id: Date.now().toString(),
                title: linkTitle,
                url: linkUrl,
                addedAt: new Date().toISOString(),
                read: false,
                categoryId: 'uncategorized'
            };

            readingList.unshift(newItem);
            await chrome.storage.local.set({ items: readingList });
            
            this.showNotification('Link added to reading list!');
            this.updateBadge();
        } catch (error) {
            console.error('Error adding link to reading list:', error);
            this.showNotification('Failed to save link.');
        }
    }

    async openReadingList() {
        // 팝업 창으로 읽기 목록 열기
        chrome.action.openPopup();
    }

    async updateBadge() {
        try {
            const result = await chrome.storage.local.get(['items']);
            const readingList = result.items || [];
            const unreadCount = readingList.filter(item => !item.read).length;
            
            // Use modern color scheme
            const badgeText = unreadCount > 0 ? unreadCount.toString() : '';
            
            await chrome.action.setBadgeText({ text: badgeText });
            await chrome.action.setBadgeBackgroundColor({ color: '#007aff' }); // Use accent-blue from CSS
            
            // Optional: Set badge text color for better contrast
            if (chrome.action.setBadgeTextColor) {
                await chrome.action.setBadgeTextColor({ color: '#ffffff' });
            }
            
            console.log(`🔢 Badge updated: ${unreadCount} unread items`);
        } catch (error) {
            console.error('❌ Error updating badge:', error);
        }
    }

    isRestrictedUrl(url) {
        const restrictedProtocols = [
            'chrome://',
            'chrome-extension://',
            'whale://',
            'whale-extension://',
            'edge://',
            'edge-extension://',
            'opera://',
            'opera-extension://',
            'brave://',
            'brave-extension://',
            'vivaldi://',
            'vivaldi-extension://',
            'moz-extension://',
            'about:',
            'file:///',
            'ftp://'
        ];

        return restrictedProtocols.some(protocol => url.startsWith(protocol)) || 
               url === 'about:blank' || 
               url === 'data:';
    }

    showNotification(message) {
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'Simple Read-Later',
            message: message
        });
    }

    async loadStorageModule() {
        // Background script에서는 Storage 모듈을 직접 사용할 수 없으므로
        // 필요한 기능만 간단히 구현
        return {
            async getAutoDeleteSettings() {
                try {
                    const result = await chrome.storage.local.get(['autoDeleteSettings']);
                    return result.autoDeleteSettings || {
                        enabled: false,
                        value: 30,
                        unit: 'days'
                    };
                } catch (error) {
                    console.error('Error loading auto-delete settings:', error);
                    return { enabled: false, value: 30, unit: 'days' };
                }
            },

            async cleanupReadItems() {
                const settings = await this.getAutoDeleteSettings();
                if (!settings.enabled) {
                    return { cleaned: 0, message: '자동 삭제가 비활성화되어 있습니다' };
                }

                try {
                    const result = await chrome.storage.local.get(['items']);
                    const items = result.items || [];
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
                    console.log(`🔍 Auto-delete check: unit=${settings.unit}, value=${settings.value}, cutoff=${cutoffDate.toISOString()}`);
                    
                    const itemsToKeep = items.filter(item => {
                        // 읽지않은 항목은 유지
                        if (!item.read) return true;
                        
                        // readAt이 없는 경우 유지 (이전 버전 호환성)
                        if (!item.readAt) return true;
                        
                        // 읽은 날짜가 cutoff 이후인 경우 유지
                        const readDate = new Date(item.readAt);
                        const shouldKeep = readDate > cutoffDate;
                        console.log(`📝 Item readAt: ${item.readAt}, should keep: ${shouldKeep}`);
                        return shouldKeep;
                    });

                    const deletedCount = items.length - itemsToKeep.length;
                    
                    if (deletedCount > 0) {
                        await chrome.storage.local.set({ items: itemsToKeep });
                        return {
                            cleaned: deletedCount,
                            success: true,
                            message: `${deletedCount}개 항목이 자동 삭제되었습니다`
                        };
                    }
                    
                    return { cleaned: 0, success: true, message: '삭제할 항목이 없습니다' };
                } catch (error) {
                    console.error('Error during cleanup:', error);
                    return { cleaned: 0, success: false, message: '자동 삭제 중 오류 발생' };
                }
            }
        };
    }

    // 리마인더 알람 처리
    async handleReminderAlarm(alarm) {
        try {
            const itemId = alarm.name.replace('reminder_', '');
            console.log(`🔔 Reminder alarm triggered for item: ${itemId}`);
            
            // 스토리지에서 아이템 조회
            const result = await chrome.storage.local.get(['items']);
            const items = result.items || [];
            const item = items.find(i => i.id === itemId);
            
            if (!item || !item.reminder) {
                console.log('❌ Item or reminder not found, skipping notification');
                return;
            }
            
            // 알림 생성
            await chrome.notifications.create(`reminder_${itemId}`, {
                type: 'basic',
                iconUrl: 'icons/icon128.png',
                title: '📚 ReadMinder',
                message: item.reminder.message || `Time to read: ${item.title}`,
                contextMessage: item.title,
                buttons: [
                    { title: 'Read Now' },
                    { title: 'Dismiss' }
                ]
            });
            
            console.log(`✅ Reminder notification sent for: ${item.title}`);
            
        } catch (error) {
            console.error('Error handling reminder alarm:', error);
        }
    }

    // 알림 클릭 처리
    setupNotificationHandlers() {
        console.log('🔔 Setting up notification handlers');
        chrome.notifications.onClicked.addListener((notificationId) => {
            if (notificationId.startsWith('reminder_')) {
                const itemId = notificationId.replace('reminder_', '');
                this.openItemFromReminder(itemId);
                chrome.notifications.clear(notificationId);
            }
        });

        chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
            if (notificationId.startsWith('reminder_')) {
                const itemId = notificationId.replace('reminder_', '');
                
                if (buttonIndex === 0) { // Read Now
                    this.openItemFromReminder(itemId);
                } else if (buttonIndex === 1) { // Dismiss
                    this.dismissReminder(itemId);
                }
                
                chrome.notifications.clear(notificationId);
            }
        });
    }

    // 리마인더에서 아이템 열기
    async openItemFromReminder(itemId) {
        try {
            const result = await chrome.storage.local.get(['items']);
            const items = result.items || [];
            const item = items.find(i => i.id === itemId);
            
            if (item) {
                // 새 탭에서 URL 열기
                await chrome.tabs.create({ url: item.url });
                
                // 읽음으로 표시
                item.read = true;
                item.readAt = new Date().toISOString();
                
                // 리마인더 제거
                delete item.reminder;
                
                // 저장
                await chrome.storage.local.set({ items });
                
                // 알람 제거
                await chrome.alarms.clear(`reminder_${itemId}`);
                
                console.log(`📖 Opened and marked as read: ${item.title}`);
            }
        } catch (error) {
            console.error('Error opening item from reminder:', error);
        }
    }

    // 리마인더 해제
    async dismissReminder(itemId) {
        try {
            const result = await chrome.storage.local.get(['items']);
            const items = result.items || [];
            const item = items.find(i => i.id === itemId);
            
            if (item && item.reminder) {
                delete item.reminder;
                await chrome.storage.local.set({ items });
                
                // 알람 제거
                await chrome.alarms.clear(`reminder_${itemId}`);
                
                console.log(`🔕 Reminder dismissed for: ${item.title}`);
            }
        } catch (error) {
            console.error('Error dismissing reminder:', error);
        }
    }

    // ...existing code...
}

// 백그라운드 서비스 시작
new ReadLaterBackground();
