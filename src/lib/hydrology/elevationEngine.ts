export interface ElevationGrid {
  rows: number;
  cols: number;
  cellSizeMeters: number;
  west: number;
  south: number;
  values: Float32Array;
  noDataValue?: number;
}

export interface ElevationCell {
  row: number;
  col: number;
  elevationMeters: number;
  slopeDegrees: number;
  slopeAspectDegrees: number;
  flowDirection: D8Direction | null;
  isSink: boolean;
}

export type D8Direction =
  | "N"
  | "NE"
  | "E"
  | "SE"
  | "S"
  | "SW"
  | "W"
  | "NW";

const DIRECTIONS: readonly { name: D8Direction; row: number; col: number; distance: number }[] = [
  { name: "N", row: -1, col: 0, distance: 1 },
  { name: "NE", row: -1, col: 1, distance: Math.SQRT2 },
  { name: "E", row: 0, col: 1, distance: 1 },
  { name: "SE", row: 1, col: 1, distance: Math.SQRT2 },
  { name: "S", row: 1, col: 0, distance: 1 },
  { name: "SW", row: 1, col: -1, distance: Math.SQRT2 },
  { name: "W", row: 0, col: -1, distance: 1 },
  { name: "NW", row: -1, col: -1, distance: Math.SQRT2 },
];

export function createElevationGrid(
  rows: number,
  cols: number,
  values: ArrayLike<number>,
  options: Pick<ElevationGrid, "cellSizeMeters" | "west" | "south"> & { noDataValue?: number },
): ElevationGrid {
  if (!Number.isInteger(rows) || rows < 1 || !Number.isInteger(cols) || cols < 1) {
    throw new Error("Elevation grid dimensions must be positive integers.");
  }
  if (values.length !== rows * cols) {
    throw new Error(`Elevation grid requires ${rows * cols} values.`);
  }
  if (!Number.isFinite(options.cellSizeMeters) || options.cellSizeMeters <= 0) {
    throw new Error("Elevation cell size must be positive.");
  }
  return {
    rows,
    cols,
    cellSizeMeters: options.cellSizeMeters,
    west: options.west,
    south: options.south,
    values: Float32Array.from(values),
    noDataValue: options.noDataValue,
  };
}

export function parseAsciiGrid(input: string): ElevationGrid {
  const lines = input.trim().split(/\r?\n/);
  const header = new Map<string, number>();
  let cursor = 0;
  while (cursor < lines.length && header.size < 6) {
    const [key, raw] = lines[cursor].trim().split(/\s+/);
    if (!key || raw === undefined) throw new Error("Invalid ASCII elevation header.");
    header.set(key.toLowerCase(), Number(raw));
    cursor++;
  }
  const required = ["ncols", "nrows", "cellsize"];
  if (required.some((key) => !header.has(key))) throw new Error("ASCII grid is missing dimensions.");
  const values = lines
    .slice(cursor)
    .flatMap((line) => line.trim().split(/\s+/).filter(Boolean).map(Number));
  return createElevationGrid(header.get("nrows")!, header.get("ncols")!, values, {
    cellSizeMeters: header.get("cellsize")!,
    west: header.get("xllcorner") ?? header.get("xllcenter") ?? 0,
    south: header.get("yllcorner") ?? header.get("yllcenter") ?? 0,
    noDataValue: header.get("nodata_value"),
  });
}

export function elevationAt(grid: ElevationGrid, row: number, col: number): number | null {
  if (row < 0 || col < 0 || row >= grid.rows || col >= grid.cols) return null;
  const value = grid.values[row * grid.cols + col];
  if (grid.noDataValue !== undefined && value === grid.noDataValue) return null;
  return Number.isFinite(value) ? value : null;
}

function gradient(grid: ElevationGrid, row: number, col: number) {
  const center = elevationAt(grid, row, col);
  if (center === null) return null;
  const west = elevationAt(grid, row, col - 1) ?? center;
  const east = elevationAt(grid, row, col + 1) ?? center;
  const north = elevationAt(grid, row - 1, col) ?? center;
  const south = elevationAt(grid, row + 1, col) ?? center;
  return { dx: (east - west) / (2 * grid.cellSizeMeters), dy: (south - north) / (2 * grid.cellSizeMeters) };
}

export function slopeAt(grid: ElevationGrid, row: number, col: number) {
  const g = gradient(grid, row, col);
  if (!g) return { degrees: 0, aspectDegrees: 0 };
  return {
    degrees: (Math.atan(Math.hypot(g.dx, g.dy)) * 180) / Math.PI,
    aspectDegrees: (Math.atan2(-g.dx, -g.dy) * 180) / Math.PI + 180,
  };
}

export function flowDirectionAt(grid: ElevationGrid, row: number, col: number): D8Direction | null {
  const source = elevationAt(grid, row, col);
  if (source === null) return null;
  let best: { direction: D8Direction; drop: number } | null = null;
  for (const direction of DIRECTIONS) {
    const target = elevationAt(grid, row + direction.row, col + direction.col);
    if (target === null) continue;
    const drop = (source - target) / direction.distance;
    if (drop > 0 && (!best || drop > best.drop)) best = { direction: direction.name, drop };
  }
  return best?.direction ?? null;
}

export function analyzeElevationGrid(grid: ElevationGrid): ElevationCell[] {
  const cells: ElevationCell[] = [];
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      const elevation = elevationAt(grid, row, col);
      if (elevation === null) continue;
      const direction = flowDirectionAt(grid, row, col);
      const slope = slopeAt(grid, row, col);
      cells.push({
        row,
        col,
        elevationMeters: elevation,
        slopeDegrees: slope.degrees,
        slopeAspectDegrees: slope.aspectDegrees,
        flowDirection: direction,
        isSink: direction === null,
      });
    }
  }
  return cells;
}

export function detectDepressions(grid: ElevationGrid, minimumDepthMeters = 0.05) {
  return analyzeElevationGrid(grid)
    .filter((cell) => {
      if (!cell.isSink) return false;
      const neighbours = DIRECTIONS.map((d) => elevationAt(grid, cell.row + d.row, cell.col + d.col)).filter(
        (value): value is number => value !== null,
      );
      return neighbours.length > 0 && Math.min(...neighbours) - cell.elevationMeters >= minimumDepthMeters;
    })
    .map((cell) => ({
      ...cell,
      depressionDepthMeters: Math.min(
        ...DIRECTIONS.map((d) => elevationAt(grid, cell.row + d.row, cell.col + d.col)).filter(
          (value): value is number => value !== null,
        ),
      ) - cell.elevationMeters,
    }));
}
