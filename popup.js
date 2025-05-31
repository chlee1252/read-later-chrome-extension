// 팝업 스크립트
class ReadLaterPopup {
    constructor() {
        this.readingList = [];
        this.init();
    }

    async init() {
        await this.loadReadingList();
        this.setupEventListeners();
        this.renderReadingList();
        this.updateBadge();
    }

    setupEventListeners() {
        // 현재 페이지 추가 버튼
        document.getElementById('addCurrentPage').addEventListener('click', () => {
            this.addCurrentPage();
        });

        // 모두 삭제 버튼
        document.getElementById('clearAll').addEventListener('click', () => {
            this.clearAll();
        });

        // 검색 입력
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filterReadingList(e.target.value);
        });
    }

    async loadReadingList() {
        try {
            const result = await chrome.storage.local.get(['readingList']);
            this.readingList = result.readingList || [];
        } catch (error) {
            console.error('Error loading reading list:', error);
            this.readingList = [];
        }
    }

    async saveReadingList() {
        try {
            await chrome.storage.local.set({ readingList: this.readingList });
            this.updateBadge();
        } catch (error) {
            console.error('Error saving reading list:', error);
        }
    }

    async addCurrentPage() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab.url || this.isRestrictedUrl(tab.url)) {
                this.showNotification('이 페이지는 저장할 수 없습니다.');
                return;
            }

            // 중복 체크
            const exists = this.readingList.some(item => item.url === tab.url);
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

            this.readingList.unshift(newItem);
            await this.saveReadingList();
            this.renderReadingList();
            this.showNotification('페이지가 저장되었습니다!');
        } catch (error) {
            console.error('Error adding current page:', error);
            this.showNotification('페이지 저장에 실패했습니다.');
        }
    }

    async markAsRead(id) {
        const item = this.readingList.find(item => item.id === id);
        if (item) {
            item.read = true;
            await this.saveReadingList();
            this.renderReadingList();
        }
    }

    async deleteItem(id) {
        this.readingList = this.readingList.filter(item => item.id !== id);
        await this.saveReadingList();
        this.renderReadingList();
    }

    async clearAll() {
        if (confirm('모든 항목을 삭제하시겠습니까?')) {
            this.readingList = [];
            await this.saveReadingList();
            this.renderReadingList();
        }
    }

    filterReadingList(searchTerm) {
        const items = document.querySelectorAll('.reading-item');
        const term = searchTerm.toLowerCase();

        items.forEach(item => {
            const title = item.querySelector('.item-title').textContent.toLowerCase();
            const url = item.querySelector('.item-url').textContent.toLowerCase();
            
            if (title.includes(term) || url.includes(term)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }

    renderReadingList() {
        const container = document.getElementById('readingList');
        const emptyState = document.getElementById('emptyState');
        const itemCount = document.getElementById('itemCount');

        // 항목 개수 업데이트
        const unreadCount = this.readingList.filter(item => !item.read).length;
        itemCount.textContent = `${this.readingList.length}개 항목 (${unreadCount}개 읽지 않음)`;

        if (this.readingList.length === 0) {
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        
        // 읽지 않은 항목을 먼저 표시
        const sortedList = [...this.readingList].sort((a, b) => {
            if (a.read === b.read) {
                return new Date(b.addedAt) - new Date(a.addedAt);
            }
            return a.read - b.read;
        });

        container.innerHTML = sortedList.map(item => this.createItemHTML(item)).join('');

        // 이벤트 리스너 추가
        this.attachItemEventListeners();
    }

    createItemHTML(item) {
        const date = new Date(item.addedAt).toLocaleDateString('ko-KR', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        return `
            <div class="reading-item ${item.read ? 'read' : ''}" data-id="${item.id}">
                <div class="item-header">
                    <div class="item-title">${this.escapeHtml(item.title)}</div>
                    <div class="item-actions">
                        ${!item.read ? `<button class="btn-small btn-read" onclick="readLater.markAsRead('${item.id}')">읽음</button>` : ''}
                        <button class="btn-small btn-delete" onclick="readLater.deleteItem('${item.id}')">삭제</button>
                    </div>
                </div>
                <div class="item-url">${this.escapeHtml(item.url)}</div>
                <div class="item-date">${date}</div>
            </div>
        `;
    }

    attachItemEventListeners() {
        document.querySelectorAll('.reading-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // 버튼 클릭은 무시
                if (e.target.tagName === 'BUTTON') return;
                
                const url = item.querySelector('.item-url').textContent;
                chrome.tabs.create({ url: url });
            });
        });
    }

    async updateBadge() {
        try {
            const unreadCount = this.readingList.filter(item => !item.read).length;
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

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message) {
        // 간단한 알림 메시지 (추후 개선 가능)
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: #28a745;
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// 전역 인스턴스 생성
const readLater = new ReadLaterPopup();
