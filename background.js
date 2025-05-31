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

        // 알람 이벤트 리스너 (자동 삭제용)
        chrome.alarms.onAlarm.addListener((alarm) => {
            if (alarm.name === 'autoCleanup') {
                this.runAutoCleanup();
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
        // 기존 메뉴 제거
        chrome.contextMenus.removeAll(() => {
            // 페이지 컨텍스트 메뉴
            chrome.contextMenus.create({
                id: 'addToReadingList',
                title: '읽기 목록에 추가',
                contexts: ['page']
            });

            // 링크 컨텍스트 메뉴
            chrome.contextMenus.create({
                id: 'addLinkToReadingList',
                title: '링크를 읽기 목록에 추가',
                contexts: ['link']
            });

            // 구분선
            chrome.contextMenus.create({
                id: 'separator',
                type: 'separator',
                contexts: ['page', 'link']
            });

            // 읽기 목록 보기
            chrome.contextMenus.create({
                id: 'viewReadingList',
                title: '읽기 목록 보기',
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
            // 유효하지 않은 페이지 체크
            if (!tab.url || this.isRestrictedUrl(tab.url)) {
                this.showNotification('이 페이지는 저장할 수 없습니다.');
                return;
            }

            const result = await chrome.storage.local.get(['items']);
            const readingList = result.items || [];

            // 중복 체크
            const exists = readingList.some(item => item.url === tab.url);
            if (exists) {
                this.showNotification('이미 저장된 페이지입니다.');
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
            
            this.showNotification('페이지가 읽기 목록에 추가되었습니다!');
            this.updateBadge();
        } catch (error) {
            console.error('Error adding page to reading list:', error);
            this.showNotification('페이지 저장에 실패했습니다.');
        }
    }

    async addLinkToList(linkUrl, tab) {
        try {
            const result = await chrome.storage.local.get(['items']);
            const readingList = result.items || [];

            // 중복 체크
            const exists = readingList.some(item => item.url === linkUrl);
            if (exists) {
                this.showNotification('이미 저장된 링크입니다.');
                return;
            }

            // 링크의 제목을 가져오기 위해 페이지를 잠시 로드
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
            
            this.showNotification('링크가 읽기 목록에 추가되었습니다!');
            this.updateBadge();
        } catch (error) {
            console.error('Error adding link to reading list:', error);
            this.showNotification('링크 저장에 실패했습니다.');
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
            await chrome.action.setBadgeBackgroundColor({ color: '#6366f1' }); // Modern indigo color
            
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

    // ...existing code...
}

// 백그라운드 서비스 시작
new ReadLaterBackground();
