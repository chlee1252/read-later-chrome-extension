const fs = require('fs-extra');
const path = require('path');

async function build() {
    const srcDir = process.cwd();
    const distDir = path.join(srcDir, 'dist');

    try {
        // Clean dist directory
        console.log('🧹 Cleaning dist directory...');
        await fs.emptyDir(distDir);

        // Files to copy
        const filesToCopy = [
            'manifest.json',
            'popup.html',
            'popup.js',
            'background.js'
        ];

        // Copy files
        console.log('📁 Copying files...');
        for (const file of filesToCopy) {
            const srcPath = path.join(srcDir, file);
            const distPath = path.join(distDir, file);
            
            if (await fs.pathExists(srcPath)) {
                await fs.copy(srcPath, distPath);
                console.log(`✅ Copied: ${file}`);
            } else {
                console.log(`⚠️  Not found: ${file}`);
            }
        }

        // Copy directories
        const dirsTooCopy = ['styles', 'src'];
        for (const dir of dirsTooCopy) {
            const srcPath = path.join(srcDir, dir);
            const distPath = path.join(distDir, dir);
            
            if (await fs.pathExists(srcPath)) {
                await fs.copy(srcPath, distPath);
                console.log(`✅ Copied: ${dir}/`);
            }
        }

        // Copy icons directory
        const iconsDir = path.join(srcDir, 'icons');
        if (await fs.pathExists(iconsDir)) {
            await fs.copy(iconsDir, path.join(distDir, 'icons'));
            console.log('✅ Copied: icons/');
        }

        // Generate PNG icons from SVG if needed
        await generateIcons(distDir);

        // Update manifest version with timestamp for development
        await updateManifestVersion(distDir);

        console.log('🎉 Build completed successfully!');
        console.log(`📦 Output directory: ${distDir}`);
        
    } catch (error) {
        console.error('❌ Build failed:', error);
        process.exit(1);
    }
}

async function generateIcons(distDir) {
    const iconSizes = [16, 32, 48, 128];
    const iconsDir = path.join(distDir, 'icons');
    
    // Create simple colored rectangles as fallback icons
    for (const size of iconSizes) {
        const iconPath = path.join(iconsDir, `icon${size}.png`);
        if (!(await fs.pathExists(iconPath))) {
            // Create a simple SVG and note that it needs conversion
            const simpleSvg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" fill="#007bff"/>
    <text x="50%" y="50%" text-anchor="middle" dy="0.3em" fill="white" font-size="${Math.floor(size/4)}" font-family="Arial">📚</text>
</svg>`;
            await fs.writeFile(iconPath.replace('.png', '.svg'), simpleSvg);
            console.log(`📝 Created temporary SVG: icon${size}.svg`);
        }
    }
    
    console.log('💡 Note: Convert SVG icons to PNG for best compatibility');
    console.log('🔧 Run: ./scripts/generate-icons.sh (requires librsvg or imagemagick)');
}

async function updateManifestVersion(distDir) {
    const manifestPath = path.join(distDir, 'manifest.json');
    const manifest = await fs.readJson(manifestPath);
    
    // Add build timestamp to version for development builds
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 16).replace(/[-:T]/g, '');
    manifest.version_name = `${manifest.version} (${timestamp})`;
    
    await fs.writeJson(manifestPath, manifest, { spaces: 2 });
    console.log(`📝 Updated manifest version: ${manifest.version_name}`);
}

// Run build
build();
