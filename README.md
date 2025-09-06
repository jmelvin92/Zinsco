# Zinsco's Moon Mission 🚀

A thrilling space adventure game where you help Zinsco reach the moon using jetpack controls!

## Game Features

- **Fullscreen Gameplay**: Immersive fullscreen experience that adapts to any screen size
- **Mouse + Keyboard Controls**: Intuitive mouse-based directional movement with keyboard backup
- **Falling Fuel System**: Fuel canisters consistently drop from the sky - catch them to keep flying!
- **3-Second Grace Period**: Fall below the screen? You have 3 seconds to get back up!
- **Dynamic Obstacles**: Asteroids and collectibles populate the space environment
- **Visual Effects**: Particle systems, glowing effects, and satisfying feedback
- **Progressive Difficulty**: 10,000m journey to the moon with increasing challenges

## How to Play

### Controls
- **🚀 Jetpack**: SPACEBAR or MOUSE CLICK - Activate jetpack thrust
- **⬅️➡️ Movement**: ARROW KEYS or MOUSE POSITION - Move left/right
- **🎯 Mouse Control**: Move your mouse left/right to guide Zinsco's direction

### Objective
- Reach the moon (10,000m distance)
- Collect fuel canisters falling from the sky to keep your jetpack powered
- Avoid asteroids and stay within the screen boundaries
- Collect coins for bonus points

### Game Mechanics
- **Fuel System**: Jetpack consumes fuel - catch falling green fuel canisters to refill
- **Grace Period**: If you fall below the screen, you have 3 seconds to return
- **Physics**: Realistic gravity and momentum-based movement
- **Scoring**: Gain points for distance traveled, fuel collected, and coins grabbed

## Technical Features

- **Responsive Design**: Scales to any screen resolution while maintaining aspect ratio
- **60fps Gameplay**: Smooth animation and responsive controls
- **Modern JavaScript**: ES6 classes and clean architecture
- **Canvas Rendering**: Hardware-accelerated 2D graphics
- **Touch Support**: Works on mobile devices with touch controls

## Game Classes

- `Game`: Main game loop and state management
- `Zinsco`: Player character with jetpack physics
- `Asteroid`: Rotating obstacles with collision detection  
- `Collectible`: Base class for coins and fuel
- `FallingFuel`: Special fuel canisters that drop from sky
- `Moon`: The ultimate destination target
- `Particle`: Visual effects system

## Installation

1. Clone this repository
2. Open `index.html` in a modern web browser
3. Click "START MISSION" and enjoy!

No build process or dependencies required - just pure HTML5, CSS3, and JavaScript!

## Development

The game uses a simple file structure:
- `index.html` - Game HTML structure and UI
- `game.js` - Main game logic and classes  
- `style.css` - Styling (embedded in HTML)

## Browser Support

Works in all modern browsers that support:
- HTML5 Canvas
- ES6 Classes
- RequestAnimationFrame

## Contributing

Feel free to fork, modify, and submit pull requests! Some ideas for enhancements:
- Additional power-ups
- Multiple levels/worlds
- Sound effects and music
- Multiplayer support
- Mobile app version

## License

Open source - feel free to use and modify!

---

🌕 **Help Zinsco reach the moon!** 🌕