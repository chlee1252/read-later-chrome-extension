const chokidar = require('chokidar');
const { exec } = require('child_process');
const path = require('path');

console.log('👀 Watching for file changes...');

// Watch for changes in source files
const watcher = chokidar.watch([
    'manifest.json',
    'popup.html',
    'popup.css', 
    'popup.js',
    'background.js',
    'icons/**/*'
], {
    ignored: ['dist/**', 'node_modules/**', '.git/**'],
    persistent: true
});

let buildTimeout;

function debouncedbuild() {
    clearTimeout(buildTimeout);
    buildTimeout = setTimeout(() => {
        console.log('🔄 Rebuilding...');
        exec('npm run build', (error, stdout, stderr) => {
            if (error) {
                console.error('❌ Build error:', error);
                return;
            }
            console.log('✅ Rebuild completed');
        });
    }, 500);
}

watcher
    .on('change', path => {
        console.log(`📝 Changed: ${path}`);
        debouncedbuild();
    })
    .on('add', path => {
        console.log(`➕ Added: ${path}`);
        debouncedbuild();
    })
    .on('unlink', path => {
        console.log(`🗑️  Removed: ${path}`);
        debouncedbuild();
    });

console.log('Press Ctrl+C to stop watching...');
