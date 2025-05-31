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
        const date = new Date(dateString);
        const now = new Date();
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
        
        // Use i18n translations if available
        if (window.i18n && typeof window.i18n.t === 'function') {
            if (diffDays === 0) {
                return window.i18n.t('today') + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            } else if (diffDays === 1) {
                return window.i18n.t('yesterday') + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            } else if (diffDays < 7) {
                return window.i18n.t('daysAgo', { days: diffDays });
            } else {
                const lang = window.i18n.getEffectiveLanguage();
                const format = window.i18n.t('longDateFormat');
                
                // Use different date formatting based on language
                const locale = window.i18n.getLocale ? window.i18n.getLocale() : 
                               (lang === 'ko' ? 'ko-KR' : 'en-US');
                
                return date.toLocaleDateString(locale, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            }
        }
        
        // Fallback if i18n not available
        return date.toLocaleDateString(navigator.language, {
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
