// 백그라운드 서비스 워커
class ReadLaterBackground {
    constructor() {
        this.init();
    }

    init() {
        // 익스텐션 설치 시 초기화
        chrome.runtime.onInstalled.addListener(() => {
            this.setupContextMenu();
            this.updateBadge();
        });

        // 스토리지 변경 감지
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'local' && changes.readingList) {
                this.updateBadge();
            }
        });

        // 컨텍스트 메뉴 클릭 처리
        chrome.contextMenus.onClicked.addListener((info, tab) => {
            this.handleContextMenuClick(info, tab);
        });

        // 액션 버튼 클릭 처리 (아이콘 클릭)
        chrome.action.onClicked.addListener((tab) => {
            this.addCurrentPageToList(tab);
        });
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

            const result = await chrome.storage.local.get(['readingList']);
            const readingList = result.readingList || [];

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
                read: false
            };

            readingList.unshift(newItem);
            await chrome.storage.local.set({ readingList });
            
            this.showNotification('페이지가 읽기 목록에 추가되었습니다!');
            this.updateBadge();
        } catch (error) {
            console.error('Error adding page to reading list:', error);
            this.showNotification('페이지 저장에 실패했습니다.');
        }
    }

    async addLinkToList(linkUrl, tab) {
        try {
            const result = await chrome.storage.local.get(['readingList']);
            const readingList = result.readingList || [];

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
                read: false
            };

            readingList.unshift(newItem);
            await chrome.storage.local.set({ readingList });
            
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
            const result = await chrome.storage.local.get(['readingList']);
            const readingList = result.readingList || [];
            const unreadCount = readingList.filter(item => !item.read).length;
            
            const badgeText = unreadCount > 0 ? unreadCount.toString() : '';
            
            await chrome.action.setBadgeText({ text: badgeText });
            await chrome.action.setBadgeBackgroundColor({ color: '#007bff' });
        } catch (error) {
            console.error('Error updating badge:', error);
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
}

// 백그라운드 서비스 시작
new ReadLaterBackground();
