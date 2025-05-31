// Utils
const Utils = {
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    truncateUrl(url, max = 35) {
        if (url.length <= max) return url;
        return url.substring(0, max - 3) + '...';
    },

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('ko-KR', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    isRestrictedUrl(url) {
        const restricted = [
            'chrome://', 'chrome-extension://',
            'whale://', 'whale-extension://',
            'edge://', 'edge-extension://',
            'about:', 'file:///', 'ftp://'
        ];
        
        return restricted.some(protocol => url.startsWith(protocol)) || 
               url === 'about:blank' || 
               url === 'data:';
    },

    generateId() {
        return Date.now().toString();
    }
};
