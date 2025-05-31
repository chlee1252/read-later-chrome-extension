// Theme management
const Theme = {
    // Theme types
    THEMES: {
        AUTO: 'auto',
        LIGHT: 'light',
        DARK: 'dark'
    },

    // Current theme
    currentTheme: 'auto',

    // Initialize theme system
    async init() {
        await this.loadTheme();
        this.applyTheme();
        this.setupSystemThemeListener();
    },

    // Load saved theme from storage
    async loadTheme() {
        try {
            const result = await chrome.storage.local.get(['theme']);
            this.currentTheme = result.theme || this.THEMES.AUTO;
        } catch (error) {
            console.error('Error loading theme:', error);
            this.currentTheme = this.THEMES.AUTO;
        }
    },

    // Set and save theme
    async setTheme(theme) {
        try {
            await chrome.storage.local.set({ theme });
            this.currentTheme = theme;
            this.applyTheme();
        } catch (error) {
            console.error('Error saving theme:', error);
        }
    },

    // Apply theme to document
    applyTheme() {
        const body = document.body;
        
        // Remove existing theme classes
        body.classList.remove('theme-light', 'theme-dark', 'theme-auto');
        
        // Add current theme class
        body.classList.add(`theme-${this.currentTheme}`);
        
        // Apply actual theme based on preference and system
        if (this.currentTheme === this.THEMES.AUTO) {
            // Let CSS handle auto theme via @media query
            body.removeAttribute('data-theme');
        } else {
            // Force specific theme
            body.setAttribute('data-theme', this.currentTheme);
        }
    },

    // Get effective theme (resolves auto to light/dark)
    getEffectiveTheme() {
        if (this.currentTheme === this.THEMES.AUTO) {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 
                this.THEMES.DARK : this.THEMES.LIGHT;
        }
        return this.currentTheme;
    },

    // Setup system theme change listener
    setupSystemThemeListener() {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', () => {
            if (this.currentTheme === this.THEMES.AUTO) {
                this.applyTheme();
            }
        });
    },

    // Toggle theme for testing
    async toggle() {
        const themes = Object.values(this.THEMES);
        const currentIndex = themes.indexOf(this.currentTheme);
        const nextIndex = (currentIndex + 1) % themes.length;
        await this.setTheme(themes[nextIndex]);
    }
};
