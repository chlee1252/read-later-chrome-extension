// Internationalization (i18n) module
class I18n {
    constructor() {
        this.currentLanguage = 'auto';
        this.detectedLanguage = this.detectSystemLanguage();
        this.translations = {
            ko: {
                // Header & Actions
                appTitle: '📚 나중에 읽기',
                addPage: '현재 페이지 저장',
                settings: '설정',
                search: '검색...',
                
                // Stats
                itemCount: '{{total}}개 ({{unread}}개 읽지않음)',
                emptyState: '저장된 항목이 없습니다',
                
                // Item Actions
                markAsRead: '읽음',
                markAsUnread: '읽지않음',
                delete: '삭제',
                
                // Settings Panel
                settingsTitle: '설정',
                close: '✕',
                theme: '테마',
                themeAuto: '자동',
                themeLight: '라이트',
                themeDark: '다크',
                language: '언어',
                languageAuto: '시스템 설정',
                languageKorean: '한국어',
                languageEnglish: 'English',
                
                // Auto Delete Settings
                autoDelete: '자동 삭제',
                autoDeleteEnabled: '읽은 항목 자동 삭제',
                deletePeriod: '삭제 기간:',
                minutes: '분',
                hours: '시간',
                days: '일',
                save: '저장',
                autoDeleteDescription: '읽음으로 표시된 항목을 지정된 기간 후 자동으로 삭제합니다.',
                
                // Categories
                all: '전체',
                allCategories: '전체',
                uncategorized: '미분류',
                addCategory: '카테고리 추가',
                addNewCategory: '새 카테고리 추가',
                categoryName: '카테고리 이름',
                enterCategoryNamePlaceholder: '카테고리 이름을 입력하세요',
                enterCategoryName: '카테고리 이름을 입력해주세요',
                icon: '아이콘',
                color: '색상',
                create: '생성',
                cancel: '취소',
                changeCategory: '카테고리 변경',
                changeCategoryOnly: '카테고리만 변경',
                changeCategoryQuestion: '카테고리를 변경하시겠습니까?',
                selectCategory: '카테고리 선택',
                selectCategoryForNewItem: '새 항목을 어느 카테고리에 저장하시겠습니까?',
                selectNewCategory: '새 카테고리를 선택해주세요',
                currentCategory: '현재 카테고리',
                category: '카테고리',
                clickToAddCategory: '클릭하여 카테고리를 추가할 수 있습니다',
                clickToChangeCategory: '클릭하여 카테고리를 변경할 수 있습니다',
                changing: '변경중...',
                
                // Toast Messages
                pageAdded: '페이지가 저장되었습니다',
                pageDuplicate: '이미 저장된 페이지입니다',
                pageCannotSave: '이 페이지는 저장할 수 없습니다',
                markedAsRead: '읽기완료로 변경되었습니다.',
                markedAsUnread: '읽지않음으로 변경되었습니다.',
                itemDeleted: '항목이 삭제되었습니다',
                categoryChanged: '카테고리가 변경되었습니다',
                autoDeleteDisabled: '자동 삭제가 비활성화되었습니다',
                autoDeleteSaved: '자동 삭제 설정 저장됨: {{value}}{{unit}} 후 삭제',
                autoDeleteSettingsSaved: '자동 삭제 설정 저장됨: {{value}}{{unit}} 후 삭제',
                autoDeleteClickSave: '시간을 설정하고 저장 버튼을 클릭하세요',
                autoDeleteNotEnabled: '자동 삭제가 비활성화되어 있습니다',
                invalidTimeValue: '올바른 시간 값을 입력해주세요',
                enterValidTime: '올바른 시간 값을 입력해주세요',
                saveFailed: '설정 저장에 실패했습니다',
                categoryCreated: '카테고리가 생성되었습니다',
                categoryCreateFailed: '카테고리 생성에 실패했습니다',
                
                // Modal and existing item messages
                alreadySavedPage: '이미 저장된 페이지',
                alreadyReadPage: '이미 읽은 페이지',
                pageAlreadySaved: '이 페이지는 이미 저장되어 있습니다.',
                pageAlreadyMarkedRead: '이 페이지는 이미 읽음으로 표시되어 있습니다.',
                whatWouldYouLike: '어떻게 하시겠습니까?',
                markedAsRead: '읽음으로 표시됨',
                saveNew: '새로 저장',
                saveNewDescription: '기존 항목이 삭제되고 새로운 "읽지않음" 항목으로 저장됨',
                
                // Error Messages
                errorAddingPage: '페이지 저장 중 오류가 발생했습니다',
                pageSaveError: '페이지 저장 중 오류가 발생했습니다',
                cannotSavePage: '이 페이지는 저장할 수 없습니다',
                alreadySaved: '이미 저장되어 있습니다',
                updateFailed: '업데이트에 실패했습니다',
                itemNotFound: '항목을 찾을 수 없습니다',
                deleted: '삭제되었습니다',
                deleteFailed: '삭제에 실패했습니다',
                categoryChangeFailed: '카테고리 변경에 실패했습니다',
                errorLoadingItems: '항목 로드 중 오류가 발생했습니다',
                errorDeletingItem: '항목 삭제 중 오류가 발생했습니다',
                
                // Time Units for Auto Delete
                timeUnits: {
                    minutes: '분',
                    hours: '시간',
                    days: '일'
                },
                
                // Time unit abbreviations (used in messages)
                timeUnit_minutes: '분',
                timeUnit_hours: '시간',
                timeUnit_days: '일',
                
                // Date and time formatting
                today: '오늘',
                yesterday: '어제',
                daysAgo: '{{days}}일 전',
                longDateFormat: 'YYYY년 M월 D일'
            },
            en: {
                // Header & Actions
                appTitle: '📚 Read Later',
                addPage: 'Save Current Page',
                settings: 'Settings',
                search: 'Search...',
                
                // Stats
                itemCount: '{{total}} items ({{unread}} unread)',
                emptyState: 'No saved items',
                
                // Item Actions
                markAsRead: 'Read',
                markAsUnread: 'Unread',
                delete: 'Delete',
                
                // Settings Panel
                settingsTitle: 'Settings',
                close: '✕',
                theme: 'Theme',
                themeAuto: 'Auto',
                themeLight: 'Light',
                themeDark: 'Dark',
                language: 'Language',
                languageAuto: 'System Default',
                languageKorean: '한국어',
                languageEnglish: 'English',
                
                // Auto Delete Settings
                autoDelete: 'Auto Delete',
                autoDeleteEnabled: 'Auto delete read items',
                deletePeriod: 'Delete after:',
                minutes: 'min',
                hours: 'hr',
                days: 'days',
                save: 'Save',
                autoDeleteDescription: 'Automatically delete items marked as read after the specified period.',
                
                // Categories
                all: 'All',
                allCategories: 'All',
                uncategorized: 'Uncategorized',
                addCategory: 'Add Category',
                addNewCategory: 'Add New Category',
                categoryName: 'Category Name',
                enterCategoryNamePlaceholder: 'Enter category name',
                enterCategoryName: 'Please enter a category name',
                icon: 'Icon',
                color: 'Color',
                create: 'Create',
                cancel: 'Cancel',
                changeCategory: 'Change Category',
                changeCategoryOnly: 'Change Category Only',
                changeCategoryQuestion: 'Would you like to change the category?',
                selectCategory: 'Select Category',
                selectCategoryForNewItem: 'Which category would you like to save the new item to?',
                selectNewCategory: 'Please select a new category',
                currentCategory: 'Current Category',
                category: 'Category',
                clickToAddCategory: 'Click to add a category',
                clickToChangeCategory: 'Click to change category',
                changing: 'Changing...',
                
                // Toast Messages
                pageAdded: 'Page saved successfully',
                pageDuplicate: 'Page already saved',
                pageCannotSave: 'Cannot save this page',
                markedAsRead: 'Marked as read',
                markedAsUnread: 'Marked as unread',
                itemDeleted: 'Item deleted',
                categoryChanged: 'Category changed',
                autoDeleteDisabled: 'Auto delete disabled',
                autoDeleteSaved: 'Auto delete saved: delete after {{value}}{{unit}}',
                autoDeleteSettingsSaved: 'Auto delete settings saved: delete after {{value}}{{unit}}',
                autoDeleteClickSave: 'Set time and click save button',
                autoDeleteNotEnabled: 'Auto delete is disabled',
                invalidTimeValue: 'Please enter a valid time value',
                enterValidTime: 'Please enter a valid time value',
                saveFailed: 'Failed to save settings',
                categoryCreated: 'Category created',
                categoryCreateFailed: 'Failed to create category',
                
                // Modal and existing item messages
                alreadySavedPage: 'Already Saved Page',
                alreadyReadPage: 'Already Read Page',
                pageAlreadySaved: 'This page is already saved.',
                pageAlreadyMarkedRead: 'This page is already marked as read.',
                whatWouldYouLike: 'What would you like to do?',
                markedAsRead: 'Marked as Read',
                saveNew: 'Save as New',
                saveNewDescription: 'Delete existing item and save as new "unread" item',
                
                // Error Messages
                errorAddingPage: 'Error occurred while saving page',
                pageSaveError: 'Error occurred while saving page',
                cannotSavePage: 'Cannot save this page',
                alreadySaved: 'Already saved',
                updateFailed: 'Update failed',
                itemNotFound: 'Item not found',
                deleted: 'Deleted',
                deleteFailed: 'Delete failed',
                categoryChangeFailed: 'Failed to change category',
                errorLoadingItems: 'Error occurred while loading items',
                errorDeletingItem: 'Error occurred while deleting item',
                
                // Time Units for Auto Delete
                timeUnits: {
                    minutes: 'min',
                    hours: 'hr',
                    days: 'days'
                },
                
                // Time unit abbreviations (used in messages)
                timeUnit_minutes: 'min',
                timeUnit_hours: 'hr', 
                timeUnit_days: 'days',
                
                // Date and time formatting
                today: 'Today',
                yesterday: 'Yesterday',
                daysAgo: '{{days}} days ago',
                longDateFormat: 'MMMM D, YYYY'
            }
        };
    }

    // Detect system language
    detectSystemLanguage() {
        const browserLang = navigator.language || navigator.userLanguage;
        if (browserLang.startsWith('ko')) {
            return 'ko';
        }
        return 'en'; // Default to English
    }

    // Get current effective language
    getEffectiveLanguage() {
        if (this.currentLanguage === 'auto') {
            return this.detectedLanguage;
        }
        return this.currentLanguage;
    }
    
    // Get locale string based on current language
    getLocale() {
        const lang = this.getEffectiveLanguage();
        switch (lang) {
            case 'ko':
                return 'ko-KR';
            case 'en':
                return 'en-US';
            default:
                return 'en-US';
        }
    }

    // Set language
    async setLanguage(language) {
        this.currentLanguage = language;
        await chrome.storage.local.set({ language: language });
        this.updatePageTexts();
    }

    // Load saved language setting
    async loadLanguage() {
        try {
            const result = await chrome.storage.local.get(['language']);
            this.currentLanguage = result.language || 'auto';
        } catch (error) {
            console.error('Error loading language setting:', error);
            this.currentLanguage = 'auto';
        }
    }

    // Get translation with interpolation support
    t(key, params = {}) {
        const lang = this.getEffectiveLanguage();
        const keys = key.split('.');
        let translation = this.translations[lang];

        for (const k of keys) {
            if (translation && translation[k]) {
                translation = translation[k];
            } else {
                console.warn(`Translation missing for key: ${key} in language: ${lang}`);
                return key;
            }
        }

        // Handle interpolation
        if (typeof translation === 'string' && Object.keys(params).length > 0) {
            return translation.replace(/\{\{(\w+)\}\}/g, (match, paramKey) => {
                return params[paramKey] !== undefined ? params[paramKey] : match;
            });
        }

        return translation;
    }

    // Update all page texts
    updatePageTexts() {
        // Update data-i18n elements
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const params = element.getAttribute('data-i18n-params');
            const parsedParams = params ? JSON.parse(params) : {};
            element.textContent = this.t(key, parsedParams);
        });

        // Update data-i18n-placeholder elements
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            element.placeholder = this.t(key);
        });

        // Update specific elements that need special handling
        this.updateSpecialElements();
        
        // Update categories and UI elements that use dynamic content
        this.updateDynamicContent();
    }

    // Update elements that need special handling
    updateSpecialElements() {
        // Update count display if it exists
        const countElement = document.getElementById('count');
        if (countElement && window.App) {
            // This will be called from the app when needed
        }

        // Update language selector buttons
        this.updateLanguageButtons();
    }

    // Update language selector buttons to reflect current selection
    updateLanguageButtons() {
        document.querySelectorAll('.language-btn').forEach(btn => {
            const lang = btn.getAttribute('data-language');
            btn.classList.toggle('active', lang === this.currentLanguage);
        });
    }
    
    // Update dynamic content like categories and dates
    updateDynamicContent() {
        // Re-render category filter to update "Add Category" and "Uncategorized" text
        if (window.CategoryUI && typeof window.CategoryUI.renderCategoryFilter === 'function') {
            window.CategoryUI.renderCategoryFilter();
        }
        
        // Update category badges in the item list to reflect language changes
        if (window.CategoryUI && typeof window.CategoryUI.updateCategoryBadges === 'function') {
            window.CategoryUI.updateCategoryBadges();
        }
        
        // Update dates in item list
        this.updateDates();
        
        // Update count display
        if (window.App && typeof window.App.updateCountDisplay === 'function') {
            window.App.updateCountDisplay();
        }
    }
    
    // Update all date displays
    updateDates() {
        document.querySelectorAll('.item-date').forEach(dateElement => {
            const itemElement = dateElement.closest('.item');
            if (itemElement) {
                const itemId = itemElement.getAttribute('data-id');
                // Get the item data and re-format the date
                if (window.App && window.App.items) {
                    const item = window.App.items.find(i => i.id === itemId);
                    if (item && item.addedAt) {
                        dateElement.textContent = Utils.formatDate(item.addedAt);
                    }
                }
            }
        });
    }

    // Initialize i18n system
    async init() {
        await this.loadLanguage();
        this.updatePageTexts();
    }
}

// Create global instance
const i18nInstance = new I18n();
window.I18n = i18nInstance;
window.i18n = i18nInstance;
