#!/bin/bash

# Extension Verification Script
echo "🔍 Read Later Extension - Category System Verification"
echo "========================================================"

# Check if dist directory exists
if [ ! -d "dist" ]; then
    echo "❌ Error: dist directory not found. Run 'npm run build' first."
    exit 1
fi

echo "✅ dist directory found"

# Check required files
required_files=(
    "dist/manifest.json"
    "dist/popup.html" 
    "dist/popup.js"
    "dist/background.js"
    "dist/src/categories.js"
    "dist/src/category-ui.js"
    "dist/src/storage.js"
    "dist/src/ui.js"
    "dist/styles/main.css"
)

missing_files=()
for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        missing_files+=("$file")
    else
        echo "✅ $file"
    fi
done

if [ ${#missing_files[@]} -ne 0 ]; then
    echo "❌ Missing files:"
    for file in "${missing_files[@]}"; do
        echo "   - $file"
    done
    exit 1
fi

# Check manifest.json structure
echo ""
echo "🔍 Checking manifest.json..."
if grep -q '"manifest_version": 3' dist/manifest.json; then
    echo "✅ Manifest v3 format"
else
    echo "❌ Invalid manifest version"
    exit 1
fi

if grep -q '"storage"' dist/manifest.json; then
    echo "✅ Storage permission"
else
    echo "❌ Missing storage permission"
    exit 1
fi

if grep -q '"contextMenus"' dist/manifest.json; then
    echo "✅ Context menus permission"
else
    echo "❌ Missing context menus permission"
    exit 1
fi

# Check category system files
echo ""
echo "🔍 Checking category system..."

if grep -q "Categories = {" dist/src/categories.js; then
    echo "✅ Categories module found"
else
    echo "❌ Categories module malformed"
    exit 1
fi

if grep -q "CategoryUI = {" dist/src/category-ui.js; then
    echo "✅ CategoryUI module found"
else
    echo "❌ CategoryUI module malformed"
    exit 1
fi

if grep -q "categoryId" dist/src/storage.js; then
    echo "✅ Storage supports categoryId"
else
    echo "❌ Storage missing categoryId support"
    exit 1
fi

if grep -q "categoryId.*uncategorized" dist/background.js; then
    echo "✅ Background script includes categoryId"
else
    echo "❌ Background script missing categoryId"
    exit 1
fi

# Check CSS includes category styles
if grep -q "category-filter" dist/styles/main.css; then
    echo "✅ Category CSS styles included"
else
    echo "❌ Category CSS styles missing"
    exit 1
fi

# Check HTML includes category elements
if grep -q "categoryFilter" dist/popup.html; then
    echo "✅ Category HTML elements included"
else
    echo "❌ Category HTML elements missing"
    exit 1
fi

echo ""
echo "🎉 Extension verification complete!"
echo ""
echo "📋 Installation Instructions:"
echo "1. Open Chrome and go to chrome://extensions/"
echo "2. Enable 'Developer mode' (toggle in top right)"
echo "3. Click 'Load unpacked'"
echo "4. Select the 'dist' folder from this directory"
echo "5. Extension should load successfully"
echo ""
echo "🧪 Testing:"
echo "- Open the extension popup"
echo "- Verify category filter bar appears"
echo "- Try adding a new category"
echo "- Test category assignment on items"
echo "- See CATEGORY_TESTING_GUIDE.md for detailed tests"
echo ""
echo "🚀 Ready for installation and testing!"
