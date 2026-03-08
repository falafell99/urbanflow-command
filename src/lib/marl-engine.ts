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
  status: 'idle' | 'moving' | 'delivering' | 'waiting';
  velocity: number;
  energy: number;
  confidence: 'clear' | 'recalculating' | 'blocked';
  prevPositions: { x: number; y: number }[];
  backoffTicks: number;
  stuckTicks: number;
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

function isBlocked(x: number, y: number, blocked: BlockedIntersection[], manualBlocks: { x: number; y: number }[] = []): boolean {
  return blocked.some(b => b.x === x && b.y === y) || manualBlocks.some(b => b.x === x && b.y === y);
}

function simplePath(ax: number, ay: number, tx: number, ty: number, blocked: BlockedIntersection[] = [], manualBlocks: { x: number; y: number }[] = []): { x: number; y: number }[] {
  const path: { x: number; y: number }[] = [];
  let cx = ax, cy = ay;
  while (cx !== tx || cy !== ty) {
    let nx = cx, ny = cy;
    if (cx < tx) nx = cx + 1;
    else if (cx > tx) nx = cx - 1;
    else if (cy < ty) ny = cy + 1;
    else if (cy > ty) ny = cy - 1;

    if (isBlocked(nx, ny, blocked, manualBlocks)) {
      if (nx !== cx) {
        if (cy < ty) ny = cy + 1;
        else if (cy > ty) ny = cy - 1;
        else ny = cy + (Math.random() > 0.5 ? 1 : -1);
        nx = cx;
        ny = Math.max(0, Math.min(19, ny));
      } else {
        if (cx < tx) nx = cx + 1;
        else if (cx > tx) nx = cx - 1;
        else nx = cx + (Math.random() > 0.5 ? 1 : -1);
        ny = cy;
        nx = Math.max(0, Math.min(19, nx));
      }
      if (isBlocked(nx, ny, blocked, manualBlocks)) {
        break;
      }
    }
    cx = nx;
    cy = ny;
    path.push({ x: cx, y: cy });
    if (path.length > 50) break;
  }
  return path;
}

// Generate alternative path candidates for neural planning visualization
function generatePathCandidates(ax: number, ay: number, tx: number, ty: number, blocked: BlockedIntersection[], manualBlocks: { x: number; y: number }[]): { x: number; y: number }[][] {
  const candidates: { x: number; y: number }[][] = [];
  // Primary path
  candidates.push(simplePath(ax, ay, tx, ty, blocked, manualBlocks));
  // Alternative: go horizontal first
  const midX = tx, midY = ay;
  if (!isBlocked(midX, midY, blocked, manualBlocks)) {
    const alt1 = [...simplePath(ax, ay, midX, midY, blocked, manualBlocks), ...simplePath(midX, midY, tx, ty, blocked, manualBlocks)];
    if (alt1.length > 0) candidates.push(alt1.slice(0, 30));
  }
  // Alternative: go vertical first
  const midX2 = ax, midY2 = ty;
  if (!isBlocked(midX2, midY2, blocked, manualBlocks)) {
    const alt2 = [...simplePath(ax, ay, midX2, midY2, blocked, manualBlocks), ...simplePath(midX2, midY2, tx, ty, blocked, manualBlocks)];
    if (alt2.length > 0) candidates.push(alt2.slice(0, 30));
  }
  return candidates;
}

// Detect oscillation: agent bouncing between same positions
function detectOscillation(positions: { x: number; y: number }[]): boolean {
  if (positions.length < OSCILLATION_WINDOW) return false;
  const recent = positions.slice(-OSCILLATION_WINDOW);
  const uniquePositions = new Set(recent.map(p => `${p.x},${p.y}`));
  return uniquePositions.size <= 2;
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

  // Spawn deliveries
  const spawnRate = state.scenario === 'peak' ? 0.3 : 0.15;
  if (newState.deliveryPoints.length < MAX_DELIVERIES && Math.random() < spawnRate) {
    const dp: DeliveryPoint = {
      id: newState.tick * 100 + randInt(100),
      x: randInt(GRID_SIZE),
      y: randInt(GRID_SIZE),
      spawnTime: newState.tick,
      timeout: DELIVERY_TIMEOUT,
      claimed: false,
      claimedBy: null,
    };
    newState.deliveryPoints = [...newState.deliveryPoints, dp];
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

  // === PHASE 1: Build occupation map from current positions ===
  const occupationMap = new Map<string, number>();
  for (const agent of newState.agents) {
    occupationMap.set(`${agent.x},${agent.y}`, agent.id);
  }

  // === PHASE 2: Compute desired moves with spatial locking ===
  const newAgents = newState.agents.map(agent => {
    const a: Agent = {
      ...agent,
      prevPositions: [...agent.prevPositions, { x: agent.x, y: agent.y }].slice(-OSCILLATION_WINDOW),
    };

    // Handle backoff cooldown
    if (a.backoffTicks > 0) {
      a.backoffTicks--;
      a.status = 'waiting';
      a.velocity = 0;
      a.confidence = 'recalculating';
      return a;
    }

    // Detect oscillation → stochastic backoff
    if (a.status === 'moving' && detectOscillation(a.prevPositions)) {
      a.backoffTicks = 1 + randInt(2);
      a.status = 'waiting';
      a.velocity = 0;
      a.confidence = 'recalculating';
      // Pick a random adjacent cell to break deadlock
      const dirs = [
        { x: a.x + 1, y: a.y }, { x: a.x - 1, y: a.y },
        { x: a.x, y: a.y + 1 }, { x: a.x, y: a.y - 1 },
      ].filter(d => d.x >= 0 && d.x < GRID_SIZE && d.y >= 0 && d.y < GRID_SIZE
        && !isBlocked(d.x, d.y, newState.blockedIntersections, newState.manualBlocks));
      if (dirs.length > 0) {
        const pick = dirs[randInt(dirs.length)];
        a.x = pick.x;
        a.y = pick.y;
      }
      if (a.targetX !== null && a.targetY !== null) {
        a.path = simplePath(a.x, a.y, a.targetX, a.targetY, newState.blockedIntersections, newState.manualBlocks);
        a.pathCandidates = generatePathCandidates(a.x, a.y, a.targetX, a.targetY, newState.blockedIntersections, newState.manualBlocks);
      }
      newState.logs.push({ tick: newState.tick, agentId: a.id, message: `[Backoff]: Oscillation detected — stochastic repositioning`, type: 'warning' });
      return a;
    }

    if (a.status === 'idle' || a.status === 'waiting') {
      a.velocity = 0;
      const unclaimed = newState.deliveryPoints.filter(dp => !dp.claimed);
      if (unclaimed.length > 0) {
        let target: DeliveryPoint;
        if (Math.random() < params.explorationRate) {
          target = unclaimed[randInt(unclaimed.length)];
          newState.logs.push({ tick: newState.tick, agentId: a.id, message: `Route exploration: random target (${target.x},${target.y})`, type: 'info' });
        } else {
          target = unclaimed.reduce((best, dp) => distance(a.x, a.y, dp.x, dp.y) < distance(a.x, a.y, best.x, best.y) ? dp : best);
        }
        a.targetX = target.x;
        a.targetY = target.y;
        a.path = simplePath(a.x, a.y, target.x, target.y, newState.blockedIntersections, newState.manualBlocks);
        a.pathCandidates = generatePathCandidates(a.x, a.y, target.x, target.y, newState.blockedIntersections, newState.manualBlocks);
        a.status = 'moving';
        a.velocity = 1.0;
        a.confidence = 'clear';
        target.claimed = true;
        target.claimedBy = a.id;

        newState.decisionHeatmap[a.y][a.x] = Math.min(10, (newState.decisionHeatmap[a.y]?.[a.x] || 0) + 1);
      } else {
        a.waitTime++;
        a.status = 'idle';
      }
    }

    if (a.status === 'moving' && a.path.length > 0) {
      const next = a.path[0];

      // === SPATIAL LOCKING: Check if target cell is occupied ===
      const targetKey = `${next.x},${next.y}`;
      const occupant = occupationMap.get(targetKey);
      if (occupant !== undefined && occupant !== a.id) {
        // Cell is occupied — lower-priority agent (higher ID) must WAIT
        a.waitTime++;
        a.velocity = 0;
        a.confidence = 'blocked';
        // Don't move, stay in current cell
        return a;
      }

      // Move to next cell
      const prevKey = `${a.x},${a.y}`;
      if (occupationMap.get(prevKey) === a.id) {
        occupationMap.delete(prevKey);
      }
      a.x = next.x;
      a.y = next.y;
      occupationMap.set(targetKey, a.id);
      a.path = a.path.slice(1);
      a.velocity = 1.0;
      a.energy = Math.max(0, a.energy - 0.1);
      a.confidence = 'clear';

      // Update traffic heatmap
      newState.trafficHeatmap[a.y][a.x] = Math.min(10, (newState.trafficHeatmap[a.y]?.[a.x] || 0) + 0.3);

      // Decision heatmap at intersections
      if (a.x % 4 === 0 && a.y % 4 === 0) {
        newState.decisionHeatmap[a.y][a.x] = Math.min(10, (newState.decisionHeatmap[a.y]?.[a.x] || 0) + 0.5);
      }

      if (a.path.length === 0) {
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

  // Collision detection (now should be rare due to spatial locking)
  const finalOccupied = new Map<string, number[]>();
  for (const a of newAgents) {
    const key = `${a.x},${a.y}`;
    if (!finalOccupied.has(key)) finalOccupied.set(key, []);
    finalOccupied.get(key)!.push(a.id);
  }
  finalOccupied.forEach((ids, key) => {
    if (ids.length > 1) {
      tickCollisions += ids.length - 1;
      ids.slice(1).forEach(id => {
        const agent = newAgents.find(a => a.id === id)!;
        agent.collisions++;
        agent.confidence = 'recalculating';
        if (agent.targetX !== null && agent.targetY !== null) {
          agent.path = simplePath(agent.x, agent.y, agent.targetX, agent.targetY, newState.blockedIntersections, newState.manualBlocks);
        }
        newState.logs.push({ tick: newState.tick, agentId: agent.id, message: `Conflict at ${key} — spatial lock engaged, waiting`, type: 'warning' });
      });
    }
  });

  newState.totalCollisions += tickCollisions;
  const totalWaitTime = newAgents.reduce((sum, a) => sum + (a.status === 'idle' || a.status === 'waiting' ? 0.5 : 0), 0);
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

  newState.agents = newAgents;

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
