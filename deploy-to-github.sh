#!/bin/bash

echo "🚀 Deploying Zinsco's Moon Mission to GitHub..."
echo "📁 Current directory: $(pwd)"

# Initialize git if not already done
if [ ! -d ".git" ]; then
    echo "📋 Initializing git repository..."
    git init
else
    echo "✅ Git repository already initialized"
fi

# Add remote if not already added
if ! git remote get-url origin &> /dev/null; then
    echo "🔗 Adding GitHub remote..."
    git remote add origin https://github.com/jmelvin92/Zinsco.git
else
    echo "✅ GitHub remote already configured"
fi

# Add all files
echo "📦 Adding files to git..."
git add .

# Create commit
echo "💾 Creating commit..."
git commit -m "🚀 Initial commit: Zinsco's Moon Mission

✨ Features:
- Fullscreen gameplay with proper scaling
- Mouse-based directional controls + keyboard backup
- Falling fuel canister system with consistent drops
- 3-second grace period for out-of-bounds recovery
- Enhanced visual effects and particle systems
- Complete moon mission with 10,000m journey

🎮 Game mechanics:
- Jetpack physics with fuel consumption
- Dynamic obstacle generation
- Collectible fuel and coin system
- Progressive difficulty scaling

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"

# Set main branch and push
echo "🚢 Pushing to GitHub..."
git branch -M main
git push -u origin main

echo ""
echo "🎉 SUCCESS! Zinsco's Moon Mission is now on GitHub!"
echo "🌐 Repository: https://github.com/jmelvin92/Zinsco"
echo "🎮 To enable GitHub Pages:"
echo "   1. Go to repository Settings"
echo "   2. Scroll to 'Pages' section"
echo "   3. Select 'Deploy from branch: main'"
echo "   4. Game will be live at: https://jmelvin92.github.io/Zinsco/"
echo ""
echo "🚀 Ready for takeoff!"