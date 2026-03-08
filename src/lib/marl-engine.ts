// Mock MARL Engine – Multi-Agent Reinforcement Learning Simulator

export interface Agent {
  id: number;
  x: number;
  y: number;
  targetX: number | null;
  targetY: number | null;
  path: { x: number; y: number }[];
  deliveries: number;
  collisions: number;
  waitTime: number;
  status: 'idle' | 'moving' | 'delivering';
}

export interface DeliveryPoint {
  id: number;
  x: number;
  y: number;
  spawnTime: number;
  timeout: number; // ticks before expiry
  claimed: boolean;
  claimedBy: number | null;
}

export interface SimState {
  agents: Agent[];
  deliveryPoints: DeliveryPoint[];
  tick: number;
  totalReward: number;
  rewardHistory: number[];
  successfulDeliveries: number;
  failedDeliveries: number;
  totalCollisions: number;
  logs: LogEntry[];
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
}

const GRID_SIZE = 20;
const AGENT_COUNT = 50;
const MAX_DELIVERIES = 8;
const DELIVERY_TIMEOUT = 60;

function randInt(max: number) {
  return Math.floor(Math.random() * max);
}

function distance(x1: number, y1: number, x2: number, y2: number) {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

export function createInitialState(): SimState {
  const agents: Agent[] = Array.from({ length: AGENT_COUNT }, (_, i) => ({
    id: i,
    x: randInt(GRID_SIZE),
    y: randInt(GRID_SIZE),
    targetX: null,
    targetY: null,
    path: [],
    deliveries: 0,
    collisions: 0,
    waitTime: 0,
    status: 'idle' as const,
  }));

  return {
    agents,
    deliveryPoints: [],
    tick: 0,
    totalReward: 0,
    rewardHistory: [0],
    successfulDeliveries: 0,
    failedDeliveries: 0,
    totalCollisions: 0,
    logs: [],
  };
}

function simplePath(ax: number, ay: number, tx: number, ty: number): { x: number; y: number }[] {
  const path: { x: number; y: number }[] = [];
  let cx = ax, cy = ay;
  while (cx !== tx || cy !== ty) {
    if (cx < tx) cx++;
    else if (cx > tx) cx--;
    else if (cy < ty) cy++;
    else if (cy > ty) cy--;
    path.push({ x: cx, y: cy });
  }
  return path;
}

export function stepSimulation(state: SimState, params: Hyperparams): SimState {
  const newState = { ...state, tick: state.tick + 1, logs: [...state.logs] };
  let tickReward = 0;

  // Spawn deliveries
  if (newState.deliveryPoints.length < MAX_DELIVERIES && Math.random() < 0.15) {
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

  // Expire deliveries
  const expiredIds = new Set<number>();
  newState.deliveryPoints = newState.deliveryPoints.filter(dp => {
    if (newState.tick - dp.spawnTime > dp.timeout) {
      expiredIds.add(dp.id);
      newState.failedDeliveries++;
      return false;
    }
    return true;
  });

  // Update agents
  const occupiedCells = new Map<string, number[]>();
  const newAgents = newState.agents.map(agent => {
    const a = { ...agent };

    // If idle, find nearest unclaimed delivery (with exploration)
    if (a.status === 'idle') {
      const unclaimed = newState.deliveryPoints.filter(dp => !dp.claimed);
      if (unclaimed.length > 0) {
        // Exploration vs exploitation
        let target: DeliveryPoint;
        if (Math.random() < params.explorationRate) {
          target = unclaimed[randInt(unclaimed.length)];
          newState.logs.push({ tick: newState.tick, agentId: a.id, message: `Exploring - random target at (${target.x},${target.y})`, type: 'info' });
        } else {
          target = unclaimed.reduce((best, dp) => distance(a.x, a.y, dp.x, dp.y) < distance(a.x, a.y, best.x, best.y) ? dp : best);
          newState.logs.push({ tick: newState.tick, agentId: a.id, message: `Exploiting - nearest target at (${target.x},${target.y})`, type: 'info' });
        }
        a.targetX = target.x;
        a.targetY = target.y;
        a.path = simplePath(a.x, a.y, target.x, target.y);
        a.status = 'moving';
        target.claimed = true;
        target.claimedBy = a.id;
      } else {
        a.waitTime++;
      }
    }

    // Move agent
    if (a.status === 'moving' && a.path.length > 0) {
      const next = a.path[0];
      a.x = next.x;
      a.y = next.y;
      a.path = a.path.slice(1);

      if (a.path.length === 0) {
        // Arrived at delivery
        a.status = 'delivering';
        a.deliveries++;
        newState.successfulDeliveries++;
        tickReward += 10;
        newState.deliveryPoints = newState.deliveryPoints.filter(dp => !(dp.x === a.targetX && dp.y === a.targetY && dp.claimedBy === a.id));
        newState.logs.push({ tick: newState.tick, agentId: a.id, message: `Delivery completed at (${a.targetX},${a.targetY}) ✓`, type: 'success' });
        a.targetX = null;
        a.targetY = null;
        a.status = 'idle';
      }
    }

    // Track cell occupation for collision detection
    const key = `${a.x},${a.y}`;
    if (!occupiedCells.has(key)) occupiedCells.set(key, []);
    occupiedCells.get(key)!.push(a.id);

    return a;
  });

  // Collision detection
  let collisions = 0;
  occupiedCells.forEach((ids, key) => {
    if (ids.length > 1) {
      collisions += ids.length - 1;
      ids.forEach(id => {
        const agent = newAgents.find(a => a.id === id)!;
        agent.collisions++;
        // Recalculate path on collision
        if (agent.path.length > 0) {
          const jitterX = Math.max(0, Math.min(GRID_SIZE - 1, agent.x + (Math.random() > 0.5 ? 1 : -1)));
          const jitterY = Math.max(0, Math.min(GRID_SIZE - 1, agent.y + (Math.random() > 0.5 ? 1 : -1)));
          agent.x = jitterX;
          agent.y = jitterY;
          if (agent.targetX !== null && agent.targetY !== null) {
            agent.path = simplePath(agent.x, agent.y, agent.targetX, agent.targetY);
          }
          newState.logs.push({ tick: newState.tick, agentId: agent.id, message: `Collision detected at ${key} - Recalculating path`, type: 'warning' });
        }
      });
    }
  });

  newState.totalCollisions += collisions;
  const totalWaitTime = newAgents.reduce((sum, a) => sum + (a.status === 'idle' ? 0.5 : 0), 0);
  tickReward -= totalWaitTime * 0.5;
  tickReward -= collisions * 50;

  // Apply learning rate dampening
  tickReward *= (1 + params.learningRate * params.discountFactor);

  newState.totalReward += tickReward;
  newState.rewardHistory = [...newState.rewardHistory, newState.totalReward];
  newState.agents = newAgents;

  // Trim logs to last 100
  if (newState.logs.length > 100) {
    newState.logs = newState.logs.slice(-100);
  }

  return newState;
}
