// MARL Engine – Multi-Agent Reinforcement Learning Simulator

export type Scenario = 'standard' | 'peak' | 'emergency';

export interface Agent {
  id: number;
  x: number;
  y: number;
  targetX: number | null;
  targetY: number | null;
  path: { x: number; y: number }[];
  pathCandidates: { x: number; y: number }[][];
  deliveries: number;
  collisions: number;
  waitTime: number;
  status: 'idle' | 'moving' | 'delivering' | 'waiting' | 'waiting_target' | 'stuck';
  velocity: number;
  energy: number;
  confidence: 'clear' | 'recalculating' | 'blocked' | 'waiting_target' | 'stuck';
  prevPositions: { x: number; y: number }[];
  backoffTicks: number;
  stuckTicks: number;
  oscillationCycles: number;
  directionChanges: number;
  coolingTicks: number;
  lastPathTick: number;
  freezeTicks: number;
}

export interface DeliveryPoint {
  id: number;
  x: number;
  y: number;
  spawnTime: number;
  timeout: number;
  claimed: boolean;
  claimedBy: number | null;
}

export interface BlockedIntersection {
  x: number;
  y: number;
}

export interface SimState {
  agents: Agent[];
  deliveryPoints: DeliveryPoint[];
  tick: number;
  totalReward: number;
  rewardHistory: number[];
  throughputHistory: number[];
  conflictHistory: number[];
  lossHistory: number[];
  successfulDeliveries: number;
  failedDeliveries: number;
  totalCollisions: number;
  logs: LogEntry[];
  scenario: Scenario;
  blockedIntersections: BlockedIntersection[];
  manualBlocks: { x: number; y: number }[];
  decisionHeatmap: number[][];
  trafficHeatmap: number[][];
}

export interface LogEntry {
  tick: number;
  agentId: number;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface Hyperparams {
  learningRate: number;
  discountFactor: number;
  explorationRate: number;
  collisionPenalty: number;
  speedVsSafety: 'speed' | 'safety';
}

const GRID_SIZE = 20;
const AGENT_COUNT_STANDARD = 50;
const AGENT_COUNT_PEAK = 100;
const MAX_DELIVERIES = 8;
const DELIVERY_TIMEOUT = 60;
const OSCILLATION_WINDOW = 6;

function randInt(max: number) {
  return Math.floor(Math.random() * max);
}

function distance(x1: number, y1: number, x2: number, y2: number) {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

function createHeatmap(): number[][] {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
}

function createAgent(id: number): Agent {
  return {
    id,
    x: randInt(GRID_SIZE),
    y: randInt(GRID_SIZE),
    targetX: null,
    targetY: null,
    path: [],
    pathCandidates: [],
    deliveries: 0,
    collisions: 0,
    waitTime: 0,
    status: 'idle',
    velocity: 0,
    energy: 85 + Math.random() * 15,
    confidence: 'clear',
    prevPositions: [],
    backoffTicks: 0,
    stuckTicks: 0,
    oscillationCycles: 0,
    directionChanges: 0,
    coolingTicks: 0,
    lastPathTick: 0,
    freezeTicks: 0,
  };
}

export function createInitialState(scenario: Scenario = 'standard'): SimState {
  const count = scenario === 'peak' ? AGENT_COUNT_PEAK : AGENT_COUNT_STANDARD;
  const agents: Agent[] = Array.from({ length: count }, (_, i) => createAgent(i));

  const blockedIntersections: BlockedIntersection[] = [];
  if (scenario === 'emergency') {
    const intersections: { x: number; y: number }[] = [];
    for (let x = 0; x < GRID_SIZE; x += 4) {
      for (let y = 0; y < GRID_SIZE; y += 4) {
        intersections.push({ x, y });
      }
    }
    for (let i = 0; i < 3 && intersections.length > 0; i++) {
      const idx = randInt(intersections.length);
      blockedIntersections.push(intersections.splice(idx, 1)[0]);
    }
  }

  return {
    agents,
    deliveryPoints: [],
    tick: 0,
    totalReward: 0,
    rewardHistory: [0],
    throughputHistory: [0],
    conflictHistory: [0],
    lossHistory: [0.8],
    successfulDeliveries: 0,
    failedDeliveries: 0,
    totalCollisions: 0,
    logs: [],
    scenario,
    blockedIntersections,
    manualBlocks: [],
    decisionHeatmap: createHeatmap(),
    trafficHeatmap: createHeatmap(),
  };
}

const WIDE_REROUTE_PENALTY = 40;
const BUFFER_ZONE_COST = 6;
const BLOCKED_REROUTE_THRESHOLD = 5;
const OSCILLATION_CYCLE_THRESHOLD = 3;
const MAX_ASTAR_ITERATIONS = 800;
const DIRECTION_CHANGE_LIMIT = 4;
const DIRECTION_WINDOW = 5;
const FREEZE_PERIOD = 15;
const PATH_DEBOUNCE_TICKS = 5;
const REPULSION_RANGE = 2;
const OBSTACLE_ADJACENCY_COST = 4;

function cellKey(x: number, y: number) {
  return `${x},${y}`;
}

function isBlocked(x: number, y: number, blocked: BlockedIntersection[], manualBlocks: { x: number; y: number }[] = []): boolean {
  return blocked.some(b => b.x === x && b.y === y) || manualBlocks.some(b => b.x === x && b.y === y);
}

function buildBufferCosts(
  agents: Agent[],
  selfId: number,
  blocked: BlockedIntersection[] = [],
  manualBlocks: { x: number; y: number }[] = [],
  boostedCell?: { x: number; y: number }
): Map<string, number> {
  const costs = new Map<string, number>();

  for (const other of agents) {
    if (other.id === selfId) continue;
    const key = cellKey(other.x, other.y);
    costs.set(key, Math.max(costs.get(key) ?? 0, BUFFER_ZONE_COST));
  }

  if (boostedCell) {
    const key = cellKey(boostedCell.x, boostedCell.y);
    costs.set(key, Math.max(costs.get(key) ?? 0, WIDE_REROUTE_PENALTY));
  }

  // Obstacle adjacency avoidance: cells next to blocked cells get extra cost
  const allBlocked = [...blocked, ...manualBlocks];
  for (const b of allBlocked) {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = b.x + dx;
      const ny = b.y + dy;
      if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) continue;
      if (isBlocked(nx, ny, blocked, manualBlocks)) continue;
      const key = cellKey(nx, ny);
      costs.set(key, Math.max(costs.get(key) ?? 0, OBSTACLE_ADJACENCY_COST));
    }
  }

  return costs;
}

function reconstructPath(cameFrom: Map<string, string>, targetKey: string): { x: number; y: number }[] {
  const path: { x: number; y: number }[] = [];
  let current: string | undefined = targetKey;

  while (current) {
    const [x, y] = current.split(',').map(Number);
    path.push({ x, y });
    current = cameFrom.get(current);
  }

  path.reverse();
  return path.slice(1);
}

function simplePath(
  ax: number,
  ay: number,
  tx: number,
  ty: number,
  blocked: BlockedIntersection[] = [],
  manualBlocks: { x: number; y: number }[] = [],
  dynamicCosts: Map<string, number> = new Map()
): { x: number; y: number }[] {
  if (ax === tx && ay === ty) return [];
  if (isBlocked(tx, ty, blocked, manualBlocks)) return [];

  const open = new Set<string>([cellKey(ax, ay)]);
  const cameFrom = new Map<string, string>();
  const gScore = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(Number.POSITIVE_INFINITY));
  const fScore = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(Number.POSITIVE_INFINITY));

  gScore[ay][ax] = 0;
  fScore[ay][ax] = distance(ax, ay, tx, ty);

  let iterations = 0;
  while (open.size > 0 && iterations < MAX_ASTAR_ITERATIONS) {
    iterations++;

    let currentKey: string | null = null;
    let bestF = Number.POSITIVE_INFINITY;

    open.forEach((key) => {
      const [x, y] = key.split(',').map(Number);
      if (fScore[y][x] < bestF) {
        bestF = fScore[y][x];
        currentKey = key;
      }
    });

    if (!currentKey) break;
    const [cx, cy] = currentKey.split(',').map(Number);

    if (cx === tx && cy === ty) {
      return reconstructPath(cameFrom, currentKey);
    }

    open.delete(currentKey);

    const neighbors = [
      { x: cx + 1, y: cy },
      { x: cx - 1, y: cy },
      { x: cx, y: cy + 1 },
      { x: cx, y: cy - 1 },
    ];

    for (const n of neighbors) {
      if (n.x < 0 || n.x >= GRID_SIZE || n.y < 0 || n.y >= GRID_SIZE) continue;
      if (isBlocked(n.x, n.y, blocked, manualBlocks)) continue;

      const nKey = cellKey(n.x, n.y);
      const stepCost = 1 + (dynamicCosts.get(nKey) ?? 0);
      const tentative = gScore[cy][cx] + stepCost;

      if (tentative < gScore[n.y][n.x]) {
        cameFrom.set(nKey, currentKey);
        gScore[n.y][n.x] = tentative;
        fScore[n.y][n.x] = tentative + distance(n.x, n.y, tx, ty);
        open.add(nKey);
      }
    }
  }

  return [];
}

// Generate alternative path candidates for neural planning visualization
function generatePathCandidates(
  ax: number,
  ay: number,
  tx: number,
  ty: number,
  blocked: BlockedIntersection[],
  manualBlocks: { x: number; y: number }[],
  dynamicCosts: Map<string, number> = new Map()
): { x: number; y: number }[][] {
  const candidates: { x: number; y: number }[][] = [];

  const primary = simplePath(ax, ay, tx, ty, blocked, manualBlocks, dynamicCosts);
  if (primary.length > 0) candidates.push(primary);

  const horizontalFirst = simplePath(ax, ay, tx, ay, blocked, manualBlocks, dynamicCosts);
  const horizontalTail = simplePath(tx, ay, tx, ty, blocked, manualBlocks, dynamicCosts);
  const alt1 = [...horizontalFirst, ...horizontalTail];
  if (alt1.length > 0) candidates.push(alt1.slice(0, 40));

  const verticalFirst = simplePath(ax, ay, ax, ty, blocked, manualBlocks, dynamicCosts);
  const verticalTail = simplePath(ax, ty, tx, ty, blocked, manualBlocks, dynamicCosts);
  const alt2 = [...verticalFirst, ...verticalTail];
  if (alt2.length > 0) candidates.push(alt2.slice(0, 40));

  return candidates;
}

function findClearanceCell(
  agent: Agent,
  blocked: BlockedIntersection[],
  manualBlocks: { x: number; y: number }[],
  occupiedNow: Set<string>,
  reservedTargets: Set<string>
): { x: number; y: number } | null {
  const neighbors = [
    { x: agent.x + 1, y: agent.y },
    { x: agent.x - 1, y: agent.y },
    { x: agent.x, y: agent.y + 1 },
    { x: agent.x, y: agent.y - 1 },
  ]
    .filter((n) => n.x >= 0 && n.x < GRID_SIZE && n.y >= 0 && n.y < GRID_SIZE)
    .sort(() => Math.random() - 0.5);

  for (const n of neighbors) {
    if (isBlocked(n.x, n.y, blocked, manualBlocks)) continue;
    const key = cellKey(n.x, n.y);
    if (occupiedNow.has(key)) continue;
    if (reservedTargets.has(key)) continue;
    return n;
  }

  return null;
}

// Detect oscillation: agent bouncing between same positions
function detectOscillation(positions: { x: number; y: number }[]): boolean {
  if (positions.length < OSCILLATION_WINDOW) return false;
  const recent = positions.slice(-OSCILLATION_WINDOW);
  const uniquePositions = new Set(recent.map(p => `${p.x},${p.y}`));
  return uniquePositions.size <= 2;
}

// BFS reachability check: can we reach (tx,ty) from (sx,sy)?
function isReachable(
  sx: number, sy: number, tx: number, ty: number,
  blocked: BlockedIntersection[], manualBlocks: { x: number; y: number }[]
): boolean {
  if (sx === tx && sy === ty) return true;
  if (isBlocked(tx, ty, blocked, manualBlocks)) return false;

  const visited = new Set<string>();
  const queue: { x: number; y: number }[] = [{ x: tx, y: ty }];
  visited.add(cellKey(tx, ty));

  // Quick flood fill from target to check if agent position is reachable
  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (cur.x === sx && cur.y === sy) return true;

    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) continue;
      const nk = cellKey(nx, ny);
      if (visited.has(nk)) continue;
      if (isBlocked(nx, ny, blocked, manualBlocks)) continue;
      visited.add(nk);
      queue.push({ x: nx, y: ny });
    }
  }
  return false;
}

// Check if a target cell is surrounded (unreachable from all 4 sides)
function isTargetTrapped(
  tx: number, ty: number,
  blocked: BlockedIntersection[], manualBlocks: { x: number; y: number }[]
): boolean {
  if (isBlocked(tx, ty, blocked, manualBlocks)) return true;
  // Check if all 4 neighbors are blocked or out of bounds
  let accessibleNeighbors = 0;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = tx + dx;
    const ny = ty + dy;
    if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE && !isBlocked(nx, ny, blocked, manualBlocks)) {
      accessibleNeighbors++;
    }
  }
  return accessibleNeighbors === 0;
}

// AI-driven log messages
const cooperativeMessages = [
  "Switched to 'Cooperative Mode' to resolve deadlock",
  "Initiating collaborative pathfinding with nearby agents",
  "Sharing reward signal with cluster — joint optimization",
  "Entered consensus protocol for intersection negotiation",
];

const optimizationMessages = [
  (pct: number) => `Global reward increased by ${pct}% after path realignment`,
  (pct: number) => `Policy gradient converged — loss reduced by ${pct}%`,
  (pct: number) => `Batch normalization improved throughput by ${pct}%`,
  (pct: number) => `Advantage estimation refined — variance reduced ${pct}%`,
];

export function stepSimulation(state: SimState, params: Hyperparams): SimState {
  const newState: SimState = {
    ...state,
    tick: state.tick + 1,
    logs: [...state.logs],
    decisionHeatmap: state.decisionHeatmap.map(row => [...row]),
    trafficHeatmap: state.trafficHeatmap.map(row => [...row]),
  };
  let tickReward = 0;
  let tickDeliveries = 0;
  let tickCollisions = 0;

  // Spawn deliveries with reachability validation
  const spawnRate = state.scenario === 'peak' ? 0.3 : 0.15;
  if (newState.deliveryPoints.length < MAX_DELIVERIES && Math.random() < spawnRate) {
    let attempts = 0;
    let validTarget = false;
    let tx = 0, ty = 0;
    while (attempts < 10 && !validTarget) {
      tx = randInt(GRID_SIZE);
      ty = randInt(GRID_SIZE);
      if (!isTargetTrapped(tx, ty, newState.blockedIntersections, newState.manualBlocks)) {
        // Quick reachability: check that at least one agent can reach it
        const anyReachable = newState.agents.some(ag =>
          isReachable(ag.x, ag.y, tx, ty, newState.blockedIntersections, newState.manualBlocks)
        );
        if (anyReachable) validTarget = true;
      }
      attempts++;
    }
    if (validTarget) {
      const dp: DeliveryPoint = {
        id: newState.tick * 100 + randInt(100),
        x: tx,
        y: ty,
        spawnTime: newState.tick,
        timeout: DELIVERY_TIMEOUT,
        claimed: false,
        claimedBy: null,
      };
      newState.deliveryPoints = [...newState.deliveryPoints, dp];
    }
  }

  // Emergency: periodically re-block intersections
  if (state.scenario === 'emergency' && newState.tick % 80 === 0 && newState.tick > 0) {
    const intersections: { x: number; y: number }[] = [];
    for (let x = 0; x < GRID_SIZE; x += 4) {
      for (let y = 0; y < GRID_SIZE; y += 4) {
        intersections.push({ x, y });
      }
    }
    const newBlocked: BlockedIntersection[] = [];
    for (let i = 0; i < 3 && intersections.length > 0; i++) {
      const idx = randInt(intersections.length);
      newBlocked.push(intersections.splice(idx, 1)[0]);
    }
    newState.blockedIntersections = newBlocked;
    newState.logs.push({
      tick: newState.tick,
      agentId: -1,
      message: `⚠ Emergency reroute: ${newBlocked.length} intersections blocked — all agents recalculating`,
      type: 'error',
    });
    newState.agents = newState.agents.map(a => {
      if (a.status === 'moving' && a.targetX !== null && a.targetY !== null) {
        return {
          ...a,
          path: simplePath(a.x, a.y, a.targetX, a.targetY, newBlocked, newState.manualBlocks),
          confidence: 'recalculating' as const,
        };
      }
      return a;
    });
  }

  // === DYNAMIC PATH INVALIDATION: check if any agent's path crosses a blocked cell ===
  newState.agents = newState.agents.map(a => {
    if (a.status !== 'moving' || a.path.length === 0) return a;
    const pathHitsBlock = a.path.some(p => isBlocked(p.x, p.y, newState.blockedIntersections, newState.manualBlocks));
    if (!pathHitsBlock) return a;
    if (a.targetX !== null && a.targetY !== null) {
      const dynamicCosts = buildBufferCosts(newState.agents, a.id, newState.blockedIntersections, newState.manualBlocks);
      const newPath = simplePath(a.x, a.y, a.targetX, a.targetY, newState.blockedIntersections, newState.manualBlocks, dynamicCosts);
      newState.logs.push({ tick: newState.tick, agentId: a.id, message: `[Path Invalidated]: Obstacle on route — immediate A* recalculation`, type: 'warning' });
      return { ...a, path: newPath, confidence: 'recalculating' as const, lastPathTick: newState.tick };
    }
    return { ...a, path: [], status: 'idle' as const };
  });

  // === EVACUATION: if an agent is standing on a blocked cell, move it out ===
  newState.agents = newState.agents.map(a => {
    if (!isBlocked(a.x, a.y, newState.blockedIntersections, newState.manualBlocks)) return a;
    const occupiedSet = new Set(newState.agents.map(ag => cellKey(ag.x, ag.y)));
    const escape = findClearanceCell(a, newState.blockedIntersections, newState.manualBlocks, occupiedSet, new Set());
    if (escape) {
      newState.logs.push({ tick: newState.tick, agentId: a.id, message: `[Evacuate]: Standing on blocked cell — moving to (${escape.x},${escape.y})`, type: 'error' });
      const updated = { ...a, x: escape.x, y: escape.y, path: [] as { x: number; y: number }[], confidence: 'recalculating' as const };
      if (updated.targetX !== null && updated.targetY !== null) {
        const dynamicCosts = buildBufferCosts(newState.agents, a.id, newState.blockedIntersections, newState.manualBlocks);
        updated.path = simplePath(escape.x, escape.y, updated.targetX, updated.targetY, newState.blockedIntersections, newState.manualBlocks, dynamicCosts);
      }
      return updated;
    }
    return a;
  });

  // Expire deliveries
  newState.deliveryPoints = newState.deliveryPoints.filter(dp => {
    if (newState.tick - dp.spawnTime > dp.timeout) {
      newState.failedDeliveries++;
      return false;
    }
    return true;
  });

  // Neural activity feed
  if (newState.tick % 12 === 0 && newState.tick > 0) {
    const agentId = randInt(newState.agents.length);
    const msg = cooperativeMessages[randInt(cooperativeMessages.length)];
    newState.logs.push({ tick: newState.tick, agentId, message: `[Decision]: ${msg}`, type: 'info' });
  }
  if (newState.tick % 18 === 0 && newState.tick > 0) {
    const pct = Math.floor(Math.random() * 15 + 3);
    const msgFn = optimizationMessages[randInt(optimizationMessages.length)];
    newState.logs.push({ tick: newState.tick, agentId: -1, message: `[Optimization]: ${msgFn(pct)}`, type: 'success' });
  }

  // === PHASE 1: CALCULATION — All agents decide their desired next cell ===
  const desiredMoves: {
    agent: Agent;
    nextX: number;
    nextY: number;
    action: 'move' | 'deliver' | 'idle' | 'wait';
    priority?: number;
  }[] = [];
  
  // Track repulsion requests from agents near their targets
  const repulsionRequests: { fromId: number; targetX: number; targetY: number }[] = [];

  // Build current occupation map
  const currentOccupied = new Set<string>();
  for (const agent of newState.agents) {
    currentOccupied.add(`${agent.x},${agent.y}`);
  }

  const updatedAgents = newState.agents.map(agent => {
    const a: Agent = {
      ...agent,
      prevPositions: [...agent.prevPositions, { x: agent.x, y: agent.y }].slice(-OSCILLATION_WINDOW),
    };

    const priorityDistance = a.targetX !== null && a.targetY !== null
      ? distance(a.x, a.y, a.targetX, a.targetY)
      : Number.POSITIVE_INFINITY;

    // === FREEZE: Anti-oscillation lock (stuck status) ===
    if (a.freezeTicks > 0) {
      a.freezeTicks--;
      a.status = 'stuck';
      a.velocity = 0;
      a.confidence = 'stuck';
      // When freeze ends, recalculate path from scratch
      if (a.freezeTicks === 0 && a.targetX !== null && a.targetY !== null) {
        const dynamicCosts = buildBufferCosts(newState.agents, a.id, newState.blockedIntersections, newState.manualBlocks);
        a.path = simplePath(a.x, a.y, a.targetX, a.targetY, newState.blockedIntersections, newState.manualBlocks, dynamicCosts);
        a.pathCandidates = generatePathCandidates(a.x, a.y, a.targetX, a.targetY, newState.blockedIntersections, newState.manualBlocks, dynamicCosts);
        a.lastPathTick = newState.tick;
        a.status = 'moving';
        a.confidence = 'recalculating';
        newState.logs.push({ tick: newState.tick, agentId: a.id, message: `[Unfreeze]: Global route recalculated — resuming movement`, type: 'info' });
      }
      desiredMoves.push({ agent: a, nextX: a.x, nextY: a.y, action: 'wait', priority: priorityDistance });
      return a;
    }

    // === Movement Cooling: too many direction changes without progress ===
    if (a.coolingTicks > 0) {
      a.coolingTicks--;
      a.status = 'waiting';
      a.velocity = 0;
      a.confidence = 'recalculating';
      desiredMoves.push({ agent: a, nextX: a.x, nextY: a.y, action: 'wait', priority: priorityDistance });
      return a;
    }

    // Track direction changes
    if (a.prevPositions.length >= 2) {
      const prev = a.prevPositions[a.prevPositions.length - 2];
      const curr = a.prevPositions[a.prevPositions.length - 1];
      const dx1 = curr.x - prev.x;
      const dy1 = curr.y - prev.y;
      const dx2 = a.x - curr.x;
      const dy2 = a.y - curr.y;
      if ((dx1 !== 0 || dy1 !== 0) && (dx2 !== 0 || dy2 !== 0) && (dx1 !== dx2 || dy1 !== dy2)) {
        a.directionChanges = (a.directionChanges || 0) + 1;
      }
    }
    if (newState.tick % DIRECTION_WINDOW === 0) {
      if (a.directionChanges >= DIRECTION_CHANGE_LIMIT) {
        // Check if agent actually progressed closer to target
        const madeProgress = a.targetX !== null && a.targetY !== null && a.prevPositions.length >= DIRECTION_WINDOW
          && distance(a.x, a.y, a.targetX, a.targetY) < distance(
            a.prevPositions[a.prevPositions.length - DIRECTION_WINDOW]?.x ?? a.x,
            a.prevPositions[a.prevPositions.length - DIRECTION_WINDOW]?.y ?? a.y,
            a.targetX, a.targetY);

        if (!madeProgress) {
          a.freezeTicks = FREEZE_PERIOD;
          a.directionChanges = 0;
          a.status = 'stuck';
          a.velocity = 0;
          a.confidence = 'stuck';
          newState.logs.push({ tick: newState.tick, agentId: a.id, message: `[STUCK] Recalculating global route... frozen for ${FREEZE_PERIOD} ticks`, type: 'error' });
          desiredMoves.push({ agent: a, nextX: a.x, nextY: a.y, action: 'wait', priority: priorityDistance });
          return a;
        }
      }
      a.directionChanges = 0;
    }

    // Handle backoff cooldown
    if (a.backoffTicks > 0) {
      a.backoffTicks--;
      a.status = 'waiting';
      a.velocity = 0;
      a.confidence = 'recalculating';
      desiredMoves.push({ agent: a, nextX: a.x, nextY: a.y, action: 'wait', priority: priorityDistance });
      return a;
    }

    // Deadlock resolver: oscillation cycles -> forced freeze
    if (a.status === 'moving' && detectOscillation(a.prevPositions)) {
      a.oscillationCycles = (a.oscillationCycles || 0) + 1;
    } else {
      a.oscillationCycles = 0;
    }

    if (a.oscillationCycles > OSCILLATION_CYCLE_THRESHOLD) {
      a.freezeTicks = FREEZE_PERIOD;
      a.oscillationCycles = 0;
      a.status = 'stuck';
      a.confidence = 'stuck';
      a.velocity = 0;
      newState.logs.push({ tick: newState.tick, agentId: a.id, message: `[STUCK] Oscillation detected — freezing for ${FREEZE_PERIOD} ticks and recalculating`, type: 'error' });
      desiredMoves.push({ agent: a, nextX: a.x, nextY: a.y, action: 'wait', priority: priorityDistance });
      return a;
    }

    // === Wait-for-target: if already in waiting_target state ===
    if (a.status === 'waiting_target') {
      if (a.targetX !== null && a.targetY !== null) {
        const targetKey = cellKey(a.targetX, a.targetY);
        if (!currentOccupied.has(targetKey)) {
          const dynamicCosts = buildBufferCosts(newState.agents, a.id, newState.blockedIntersections, newState.manualBlocks);
          a.path = simplePath(a.x, a.y, a.targetX, a.targetY, newState.blockedIntersections, newState.manualBlocks, dynamicCosts);
          a.status = 'moving';
          a.confidence = 'clear';
          a.velocity = 1.0;
        } else {
          a.velocity = 0;
          a.confidence = 'waiting_target';
          desiredMoves.push({ agent: a, nextX: a.x, nextY: a.y, action: 'wait', priority: priorityDistance });
          return a;
        }
      } else {
        a.status = 'idle';
      }
    }

    // Assign target if idle/waiting
    if (a.status === 'idle' || a.status === 'waiting') {
      a.velocity = 0;
      a.stuckTicks = 0;
      const unclaimed = newState.deliveryPoints.filter(dp => !dp.claimed);
      if (unclaimed.length > 0) {
        // Filter to only reachable targets
        const reachable = unclaimed.filter(dp =>
          !isTargetTrapped(dp.x, dp.y, newState.blockedIntersections, newState.manualBlocks)
          && isReachable(a.x, a.y, dp.x, dp.y, newState.blockedIntersections, newState.manualBlocks)
        );

        if (reachable.length === 0) {
          a.waitTime++;
          a.status = 'idle';
          desiredMoves.push({ agent: a, nextX: a.x, nextY: a.y, action: 'idle', priority: priorityDistance });
          return a;
        }

        let target: DeliveryPoint;
        if (Math.random() < params.explorationRate) {
          target = reachable[randInt(reachable.length)];
          newState.logs.push({ tick: newState.tick, agentId: a.id, message: `Route exploration: random target (${target.x},${target.y})`, type: 'info' });
        } else {
          target = reachable.reduce((best, dp) => distance(a.x, a.y, dp.x, dp.y) < distance(a.x, a.y, best.x, best.y) ? dp : best);
        }

        // Target Availability Check
        const targetKey = cellKey(target.x, target.y);
        if (currentOccupied.has(targetKey)) {
          a.targetX = target.x;
          a.targetY = target.y;
          a.status = 'waiting_target';
          a.confidence = 'waiting_target';
          a.velocity = 0;
          target.claimed = true;
          target.claimedBy = a.id;
          desiredMoves.push({ agent: a, nextX: a.x, nextY: a.y, action: 'wait', priority: priorityDistance });
          return a;
        }

        a.targetX = target.x;
        a.targetY = target.y;
        a.lastPathTick = newState.tick;
        const dynamicCosts = buildBufferCosts(newState.agents, a.id, newState.blockedIntersections, newState.manualBlocks);
        a.path = simplePath(a.x, a.y, target.x, target.y, newState.blockedIntersections, newState.manualBlocks, dynamicCosts);
        a.pathCandidates = generatePathCandidates(a.x, a.y, target.x, target.y, newState.blockedIntersections, newState.manualBlocks, dynamicCosts);
        a.status = 'moving';
        a.velocity = 1.0;
        a.confidence = 'clear';
        target.claimed = true;
        target.claimedBy = a.id;
        newState.decisionHeatmap[a.y][a.x] = Math.min(10, (newState.decisionHeatmap[a.y]?.[a.x] || 0) + 1);
      } else {
        a.waitTime++;
        a.status = 'idle';
        desiredMoves.push({ agent: a, nextX: a.x, nextY: a.y, action: 'idle', priority: priorityDistance });
        return a;
      }
    }

    // === Smart Arrival: 1-2 cells from target & blocked → repulsion + wait ===
    if (a.status === 'moving' && a.targetX !== null && a.targetY !== null) {
      const distToTarget = distance(a.x, a.y, a.targetX, a.targetY);
      if (distToTarget <= REPULSION_RANGE) {
        const targetKey = cellKey(a.targetX, a.targetY);
        if (currentOccupied.has(targetKey)) {
          // Send repulsion signal to nearby idle/waiting agents
          repulsionRequests.push({ fromId: a.id, targetX: a.targetX, targetY: a.targetY });

          if (distToTarget <= 1) {
            a.status = 'waiting_target';
            a.confidence = 'waiting_target';
            a.velocity = 0;
            a.path = [];
            desiredMoves.push({ agent: a, nextX: a.x, nextY: a.y, action: 'wait', priority: priorityDistance });
            return a;
          }
        }
      }
    }

    // Moving agents: follow persisted path
    if (a.status === 'moving' && a.path.length > 0) {
      const next = a.path[0];
      desiredMoves.push({ agent: a, nextX: next.x, nextY: next.y, action: 'move', priority: priorityDistance });
    } else {
      desiredMoves.push({ agent: a, nextX: a.x, nextY: a.y, action: 'idle', priority: priorityDistance });
    }

    return a;
  });

  // === NEIGHBOR REPULSION: Process repulsion requests ===
  for (const req of repulsionRequests) {
    for (let i = 0; i < updatedAgents.length; i++) {
      const neighbor = updatedAgents[i];
      if (neighbor.id === req.fromId) continue;
      if (neighbor.status !== 'idle' && neighbor.status !== 'waiting') continue;
      const distToRepulsor = distance(neighbor.x, neighbor.y, req.targetX, req.targetY);
      if (distToRepulsor > REPULSION_RANGE) continue;

      // Find nearest empty cell away from the target
      const clearance = findClearanceCell(
        neighbor,
        newState.blockedIntersections,
        newState.manualBlocks,
        currentOccupied,
        new Set<string>()
      );
      if (clearance) {
        desiredMoves[i] = {
          agent: neighbor,
          nextX: clearance.x,
          nextY: clearance.y,
          action: 'move',
          priority: Number.POSITIVE_INFINITY,
        };
        newState.logs.push({ tick: newState.tick, agentId: neighbor.id, message: `[Yield]: Repulsion signal received — clearing path for Agent ${String(req.fromId).padStart(3, '0')}`, type: 'info' });
      }
    }
  }

  // === CELL RESERVATION SYSTEM ===
  const reservations = new Map<string, number[]>();
  for (let i = 0; i < desiredMoves.length; i++) {
    const move = desiredMoves[i];
    if (move.action !== 'move') continue;
    const key = cellKey(move.nextX, move.nextY);
    if (!reservations.has(key)) reservations.set(key, []);
    reservations.get(key)!.push(i);
  }

  const blockedAgentIndices = new Set<number>();
  const reservedTargets = new Set<string>();

  // Resolve reservation conflicts by priority: closer-to-target wins, then lower ID.
  reservations.forEach((indices, key) => {
    if (indices.length === 1) {
      reservedTargets.add(key);
      return;
    }

    indices.sort((a, b) => {
      const pa = desiredMoves[a].priority ?? Number.POSITIVE_INFINITY;
      const pb = desiredMoves[b].priority ?? Number.POSITIVE_INFINITY;
      if (pa !== pb) return pa - pb;
      return desiredMoves[a].agent.id - desiredMoves[b].agent.id;
    });

    const winner = indices[0];
    reservedTargets.add(cellKey(desiredMoves[winner].nextX, desiredMoves[winner].nextY));

    for (let k = 1; k < indices.length; k++) {
      const loserIdx = indices[k];
      const loser = updatedAgents[loserIdx];
      const clearance = findClearanceCell(
        loser,
        newState.blockedIntersections,
        newState.manualBlocks,
        currentOccupied,
        reservedTargets
      );

      if (clearance) {
        desiredMoves[loserIdx] = {
          ...desiredMoves[loserIdx],
          nextX: clearance.x,
          nextY: clearance.y,
          action: 'move',
        };
        reservedTargets.add(cellKey(clearance.x, clearance.y));
        continue;
      }

      blockedAgentIndices.add(loserIdx);
      tickCollisions++;
    }
  });

  // Prevent entering cells occupied by agents that are not leaving this tick.
  const stationaryCells = new Set<string>();
  for (let i = 0; i < updatedAgents.length; i++) {
    const move = desiredMoves[i];
    if (!move || move.action !== 'move' || blockedAgentIndices.has(i)) {
      stationaryCells.add(cellKey(updatedAgents[i].x, updatedAgents[i].y));
    }
  }

  for (let i = 0; i < desiredMoves.length; i++) {
    if (blockedAgentIndices.has(i)) continue;
    const move = desiredMoves[i];
    if (!move || move.action !== 'move') continue;

    const key = cellKey(move.nextX, move.nextY);

    // CRITICAL: prevent movement into blocked cells (movement-loop check)
    if (isBlocked(move.nextX, move.nextY, newState.blockedIntersections, newState.manualBlocks)) {
      blockedAgentIndices.add(i);
      tickCollisions++;
      continue;
    }

    if (!stationaryCells.has(key)) continue;

    const clearance = findClearanceCell(
      updatedAgents[i],
      newState.blockedIntersections,
      newState.manualBlocks,
      currentOccupied,
      reservedTargets
    );

    if (clearance) {
      desiredMoves[i] = {
        ...desiredMoves[i],
        nextX: clearance.x,
        nextY: clearance.y,
        action: 'move',
      };
      reservedTargets.add(cellKey(clearance.x, clearance.y));
    } else {
      blockedAgentIndices.add(i);
      tickCollisions++;
    }
  }

  // === PHASE 2: ATOMIC MOVEMENT — Apply all moves simultaneously ===
  const finalAgents = updatedAgents.map((agent, i) => {
    const move = desiredMoves[i];
    if (!move) return agent;
    const a = { ...agent };

    if (blockedAgentIndices.has(i)) {
      // Agent was denied reservation — WAIT
      a.waitTime++;
      a.velocity = 0;
      a.confidence = 'blocked';
      a.status = 'waiting';
      a.stuckTicks = (a.stuckTicks || 0) + 1;

      // Wide reroute only after sustained blockage
      if (a.stuckTicks > BLOCKED_REROUTE_THRESHOLD && a.targetX !== null && a.targetY !== null) {
        const blockingCell = { x: move.nextX, y: move.nextY };
        const dynamicCosts = buildBufferCosts(updatedAgents, a.id, newState.blockedIntersections, newState.manualBlocks, blockingCell);
        a.path = simplePath(a.x, a.y, a.targetX, a.targetY, newState.blockedIntersections, newState.manualBlocks, dynamicCosts);
        a.pathCandidates = generatePathCandidates(a.x, a.y, a.targetX, a.targetY, newState.blockedIntersections, newState.manualBlocks, dynamicCosts);
        a.stuckTicks = 0;
        a.status = 'moving';
        a.confidence = 'recalculating';
        newState.logs.push({ tick: newState.tick, agentId: a.id, message: `[Wide Reroute]: Blocked >5 ticks — boosting cost at (${blockingCell.x},${blockingCell.y}) to escape jam`, type: 'warning' });
      }
      return a;
    }

    if (move.action === 'move' && (move.nextX !== a.x || move.nextY !== a.y)) {
      a.x = move.nextX;
      a.y = move.nextY;
      a.velocity = 1.0;
      a.energy = Math.max(0, a.energy - 0.1);
      a.confidence = 'clear';
      a.stuckTicks = 0;

      // Consume path step (with debounced recalculation)
      if (a.path.length > 0 && a.path[0].x === move.nextX && a.path[0].y === move.nextY) {
        a.path = a.path.slice(1);
      } else if (a.targetX !== null && a.targetY !== null) {
        // Path debounce: only recalculate every PATH_DEBOUNCE_TICKS
        if (newState.tick - (a.lastPathTick || 0) >= PATH_DEBOUNCE_TICKS) {
          a.lastPathTick = newState.tick;
          const dynamicCosts = buildBufferCosts(updatedAgents, a.id, newState.blockedIntersections, newState.manualBlocks);
          a.path = simplePath(a.x, a.y, a.targetX, a.targetY, newState.blockedIntersections, newState.manualBlocks, dynamicCosts);
          a.pathCandidates = generatePathCandidates(a.x, a.y, a.targetX, a.targetY, newState.blockedIntersections, newState.manualBlocks, dynamicCosts);
        }
      }

      // Update traffic heatmap
      newState.trafficHeatmap[a.y][a.x] = Math.min(10, (newState.trafficHeatmap[a.y]?.[a.x] || 0) + 0.3);

      // Decision heatmap at intersections
      if (a.x % 4 === 0 && a.y % 4 === 0) {
        newState.decisionHeatmap[a.y][a.x] = Math.min(10, (newState.decisionHeatmap[a.y]?.[a.x] || 0) + 0.5);
      }

      // Check if delivery complete
      if (a.path.length === 0 && a.targetX !== null && a.targetY !== null) {
        a.status = 'delivering';
        a.deliveries++;
        newState.successfulDeliveries++;
        tickDeliveries++;
        tickReward += 10;
        newState.deliveryPoints = newState.deliveryPoints.filter(dp => !(dp.x === a.targetX && dp.y === a.targetY && dp.claimedBy === a.id));
        newState.logs.push({ tick: newState.tick, agentId: a.id, message: `Delivery confirmed at (${a.targetX},${a.targetY})`, type: 'success' });
        a.targetX = null;
        a.targetY = null;
        a.pathCandidates = [];
        a.status = 'idle';
        a.velocity = 0;
        a.confidence = 'clear';
      }
    }

    return a;
  });

  // Log reservation conflicts
  if (tickCollisions > 0) {
    newState.logs.push({ tick: newState.tick, agentId: -1, message: `[Reservation]: ${tickCollisions} cell conflicts resolved — lower-priority agents waiting`, type: 'warning' });
  }

  newState.totalCollisions += tickCollisions;
  const totalWaitTime = finalAgents.reduce((sum, a) => sum + (a.status === 'idle' || a.status === 'waiting' ? 0.5 : 0), 0);
  tickReward -= totalWaitTime * 0.5;
  tickReward -= tickCollisions * params.collisionPenalty;
  const safetyMod = params.speedVsSafety === 'safety' ? 0.7 : 1.0;
  tickReward *= safetyMod * (1 + params.learningRate * params.discountFactor);

  newState.totalReward += tickReward;
  newState.rewardHistory = [...newState.rewardHistory, newState.totalReward];
  newState.throughputHistory = [...newState.throughputHistory, tickDeliveries];
  newState.conflictHistory = [...newState.conflictHistory, tickCollisions];

  const prevLoss = state.lossHistory[state.lossHistory.length - 1] || 0.8;
  const decay = 0.997;
  const noise = (Math.random() - 0.5) * 0.02;
  const newLoss = Math.max(0.01, prevLoss * decay + noise);
  newState.lossHistory = [...newState.lossHistory, newLoss];

  newState.agents = finalAgents;

  // Decay heatmaps
  if (newState.tick % 5 === 0) {
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        newState.decisionHeatmap[y][x] = Math.max(0, newState.decisionHeatmap[y][x] * 0.95);
        newState.trafficHeatmap[y][x] = Math.max(0, newState.trafficHeatmap[y][x] * 0.9);
      }
    }
  }

  if (newState.logs.length > 100) {
    newState.logs = newState.logs.slice(-100);
  }

  return newState;
}
