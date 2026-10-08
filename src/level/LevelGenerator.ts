export class LevelGenerator {
    public width: number;
    public height: number;
    public grid: number[][]; // 1 = wall, 0 = floor

    constructor(width: number, height: number, floor: number) {
        this.width = width;
        this.height = height;
        this.grid = [];

        for (let y = 0; y < height; y++) {
            this.grid[y] = [];
            for (let x = 0; x < width; x++) {
                if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
                    this.grid[y][x] = 1;
                } else {
                    this.grid[y][x] = 0;
                }
            }
        }

        if (floor % 10 !== 0) { // Not a boss room
            for (let i = 0; i < 15; i++) {
                const px = Math.floor(2 + Math.random() * (width - 5));
                const py = Math.floor(2 + Math.random() * (height - 5));
                
                this.grid[py][px] = 1;
                this.grid[py+1][px] = 1;
                this.grid[py][px+1] = 1;
                this.grid[py+1][px+1] = 1;
            }
        }
    }

    public getHazardLocations(count: number): { x: number, y: number }[] {
        const locs = [];
        for (let i = 0; i < count; i++) {
            locs.push(this.getValidSpawnPoint());
        }
        return locs;
    }

    public getValidSpawnPoint(): { x: number, y: number } {
        let x = 0, y = 0;
        let limit = 1000;
        while (limit > 0) {
            x = Math.floor(Math.random() * this.width);
            y = Math.floor(Math.random() * this.height);
            if (this.grid[y][x] === 0) return { x, y };
            limit--;
        }
        // Fallback
        return { x: Math.floor(this.width / 2), y: Math.floor(this.height / 2) };
    }
}
