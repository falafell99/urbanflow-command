// MARL Engine – Multi-Agent Reinforcement Learning Simulator

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
  velocity: number;
  energy: number;
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

export interface SimState {
  agents: Agent[];
  deliveryPoints: DeliveryPoint[];
  tick: number;
  totalReward: number;
  rewardHistory: number[];
  throughputHistory: number[];
  conflictHistory: number[];
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
    velocity: 0,
    energy: 85 + Math.random() * 15,
  }));

  return {
    agents,
    deliveryPoints: [],
    tick: 0,
    totalReward: 0,
    rewardHistory: [0],
    throughputHistory: [0],
    conflictHistory: [0],
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
  let tickDeliveries = 0;
  let tickCollisions = 0;

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
  newState.deliveryPoints = newState.deliveryPoints.filter(dp => {
    if (newState.tick - dp.spawnTime > dp.timeout) {
      newState.failedDeliveries++;
      return false;
    }
    return true;
  });

  // Update agents
  const occupiedCells = new Map<string, number[]>();
  const newAgents = newState.agents.map(agent => {
    const a = { ...agent };

    if (a.status === 'idle') {
      a.velocity = 0;
      const unclaimed = newState.deliveryPoints.filter(dp => !dp.claimed);
      if (unclaimed.length > 0) {
        let target: DeliveryPoint;
        if (Math.random() < params.explorationRate) {
          target = unclaimed[randInt(unclaimed.length)];
          newState.logs.push({ tick: newState.tick, agentId: a.id, message: `Route exploration: random target (${target.x},${target.y})`, type: 'info' });
        } else {
          target = unclaimed.reduce((best, dp) => distance(a.x, a.y, dp.x, dp.y) < distance(a.x, a.y, best.x, best.y) ? dp : best);
          newState.logs.push({ tick: newState.tick, agentId: a.id, message: `Optimal route selected → (${target.x},${target.y})`, type: 'info' });
        }
        a.targetX = target.x;
        a.targetY = target.y;
        a.path = simplePath(a.x, a.y, target.x, target.y);
        a.status = 'moving';
        a.velocity = 1.0;
        target.claimed = true;
        target.claimedBy = a.id;
      } else {
        a.waitTime++;
      }
    }

    if (a.status === 'moving' && a.path.length > 0) {
      const next = a.path[0];
      a.x = next.x;
      a.y = next.y;
      a.path = a.path.slice(1);
      a.velocity = 1.0;
      a.energy = Math.max(0, a.energy - 0.1);

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
        a.status = 'idle';
        a.velocity = 0;
      }
    }

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
        if (agent.path.length > 0) {
          const jitterX = Math.max(0, Math.min(GRID_SIZE - 1, agent.x + (Math.random() > 0.5 ? 1 : -1)));
          const jitterY = Math.max(0, Math.min(GRID_SIZE - 1, agent.y + (Math.random() > 0.5 ? 1 : -1)));
          agent.x = jitterX;
          agent.y = jitterY;
          if (agent.targetX !== null && agent.targetY !== null) {
            agent.path = simplePath(agent.x, agent.y, agent.targetX, agent.targetY);
          }
          newState.logs.push({ tick: newState.tick, agentId: agent.id, message: `Conflict at ${key} — rerouting via avoidance protocol`, type: 'warning' });
        }
      });
    }
  });

  tickCollisions = collisions;
  newState.totalCollisions += collisions;
  const totalWaitTime = newAgents.reduce((sum, a) => sum + (a.status === 'idle' ? 0.5 : 0), 0);
  tickReward -= totalWaitTime * 0.5;
  tickReward -= collisions * 50;
  tickReward *= (1 + params.learningRate * params.discountFactor);

  newState.totalReward += tickReward;
  newState.rewardHistory = [...newState.rewardHistory, newState.totalReward];
  newState.throughputHistory = [...newState.throughputHistory, tickDeliveries];
  newState.conflictHistory = [...newState.conflictHistory, tickCollisions];
  newState.agents = newAgents;

  if (newState.logs.length > 100) {
    newState.logs = newState.logs.slice(-100);
  }

  return newState;
}
