import Phaser from 'phaser';

export class FlowField {
    public width: number;
    public height: number;
    public grid: number[][]; 
    public integrationField: number[][];
    public vectorField: Phaser.Math.Vector2[][];

    private targetX: number = -1;
    private targetY: number = -1;

    constructor(grid: number[][]) {
        this.height = grid.length;
        this.width = grid[0].length;
        this.grid = grid;
        this.integrationField = [];
        this.vectorField = [];

        for (let y = 0; y < this.height; y++) {
            this.integrationField[y] = new Array(this.width).fill(9999);
            this.vectorField[y] = new Array(this.width);
            for (let x = 0; x < this.width; x++) {
                this.vectorField[y][x] = new Phaser.Math.Vector2(0, 0);
            }
        }
    }

    public updateTarget(targetGridX: number, targetGridY: number) {
        if (targetGridX === this.targetX && targetGridY === this.targetY) {
            return;
        }
        
        if (targetGridX < 0 || targetGridX >= this.width || targetGridY < 0 || targetGridY >= this.height) return;
        if (this.grid[targetGridY][targetGridX] === 1) return;

        this.targetX = targetGridX;
        this.targetY = targetGridY;
        
        this.generateIntegrationField();
        this.generateVectorField();
    }

    private generateIntegrationField() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                this.integrationField[y][x] = 9999;
            }
        }

        this.integrationField[this.targetY][this.targetX] = 0;

        const queue: {x: number, y: number}[] = [{x: this.targetX, y: this.targetY}];

        while (queue.length > 0) {
            const current = queue.shift()!;
            const currentDist = this.integrationField[current.y][current.x];

            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    
                    const nx = current.x + dx;
                    const ny = current.y + dy;

                    if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                        if (this.grid[ny][nx] === 0) {
                            const isDiagonal = (dx !== 0 && dy !== 0);
                            const cost = isDiagonal ? 14 : 10;
                            
                            if (isDiagonal) {
                                if (this.grid[current.y][nx] === 1 || this.grid[ny][current.x] === 1) {
                                    continue;
                                }
                            }

                            if (currentDist + cost < this.integrationField[ny][nx]) {
                                this.integrationField[ny][nx] = currentDist + cost;
                                queue.push({x: nx, y: ny});
                            }
                        }
                    }
                }
            }
        }
    }

    private generateVectorField() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.grid[y][x] === 1) {
                    this.vectorField[y][x].set(0, 0);
                    continue;
                }

                let minCost = this.integrationField[y][x];
                let bestDx = 0;
                let bestDy = 0;

                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        
                        const nx = x + dx;
                        const ny = y + dy;

                        if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                            if (this.grid[ny][nx] === 0) {
                                const isDiagonal = (dx !== 0 && dy !== 0);
                                if (isDiagonal) {
                                    if (this.grid[y][nx] === 1 || this.grid[ny][x] === 1) {
                                        continue;
                                    }
                                }

                                if (this.integrationField[ny][nx] < minCost) {
                                    minCost = this.integrationField[ny][nx];
                                    bestDx = dx;
                                    bestDy = dy;
                                }
                            }
                        }
                    }
                }
                
                this.vectorField[y][x].set(bestDx, bestDy).normalize();
            }
        }
    }

    public getDirection(x: number, y: number, tileSize: number): Phaser.Math.Vector2 {
        const gridX = Math.floor(x / tileSize);
        const gridY = Math.floor(y / tileSize);

        if (gridX >= 0 && gridX < this.width && gridY >= 0 && gridY < this.height) {
            return this.vectorField[gridY][gridX];
        }
        return new Phaser.Math.Vector2(0, 0);
    }
}
