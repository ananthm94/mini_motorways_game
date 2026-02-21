export const GameConfig = {
    // Grid settings
    GRID_SIZE: 25, // pixels per grid cell
    
    // Game dimensions (in grid cells)
    GAME_WIDTH: 48,  // 1200px / 25px = 48 cells
    GAME_HEIGHT: 32, // 800px / 25px = 32 cells
    
    // Colors for houses and destinations (4 colors as per plan)
    COLORS: [
        0xff6b6b, // Red
        0x4ecdc4, // Teal
        0xffe66d, // Yellow
        0x95e1d3, // Mint
    ],
    
    // Spawning
    INITIAL_SPAWN_DELAY: 4000, // ms before first spawn
    SPAWN_INTERVAL: 6000, // ms between spawns
    SPAWN_INTERVAL_DECREASE: 100, // decrease by this amount each spawn
    MIN_SPAWN_INTERVAL: 2500, // minimum interval
    
    // Traffic
    CAR_SPEED: 80, // pixels per second (slightly slower for better visibility)
    CAR_SPAWN_DELAY: 3000, // ms between car spawns from same house
    MAX_CARS_PER_DESTINATION: 6, // game over if exceeded
    
    // Road
    ROAD_WIDTH: 20, // pixels
    ROAD_COLOR: 0x34495e,
    
    // Buildings
    HOUSE_SIZE: 15,
    DESTINATION_SIZE: 20,
    
    // Scoring
    POINTS_PER_DELIVERY: 10,
};
