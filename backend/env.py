"""
UrbanFlow - Multi-Agent Delivery Environment
A grid-based environment where agents learn to deliver packages
without collisions using MARL with PPO.
"""

import numpy as np
import random
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class Package:
    id: int
    pickup: tuple[int, int]
    dropoff: tuple[int, int]
    delivered: bool = False


@dataclass
class Agent:
    id: int
    pos: tuple[int, int]
    package: Optional[Package] = None
    deliveries: int = 0
    collisions: int = 0
    steps: int = 0


class UrbanGridEnv:
    """
    NxN grid environment with M agents delivering packages.

    Observation per agent (local 5x5 view flattened + agent state):
        - 5x5 grid cells around agent (25 values): 0=empty, 1=wall, 2=agent, 3=pickup, 4=dropoff
        - agent has package: 1 value
        - relative direction to target (dx, dy normalized): 2 values
        Total: 28 values

    Actions: 0=North, 1=South, 2=East, 3=West, 4=Wait
    """

    ACTIONS = [(-1, 0), (1, 0), (0, 1), (0, -1), (0, 0)]  # N, S, E, W, Wait
    OBS_SIZE = 28

    def __init__(self, grid_size: int = 10, n_agents: int = 4, n_packages: int = 8):
        self.grid_size = grid_size
        self.n_agents = n_agents
        self.n_packages = n_packages
        self.agents: list[Agent] = []
        self.packages: list[Package] = []
        self.step_count = 0
        self.max_steps = 200

    def reset(self) -> list[np.ndarray]:
        self.step_count = 0
        self.packages = []
        self.agents = []

        positions = random.sample(
            [(r, c) for r in range(self.grid_size) for c in range(self.grid_size)],
            self.n_agents + self.n_packages * 2
        )

        for i in range(self.n_agents):
            self.agents.append(Agent(id=i, pos=positions[i]))

        pkg_positions = positions[self.n_agents:]
        for i in range(self.n_packages):
            self.packages.append(Package(
                id=i,
                pickup=pkg_positions[i * 2],
                dropoff=pkg_positions[i * 2 + 1]
            ))

        return [self._get_obs(a) for a in self.agents]

    def step(self, actions: list[int]) -> tuple[list[np.ndarray], list[float], bool]:
        rewards = [0.0] * self.n_agents
        self.step_count += 1

        # Compute new positions
        new_positions = []
        for i, agent in enumerate(self.agents):
            dr, dc = self.ACTIONS[actions[i]]
            nr = max(0, min(self.grid_size - 1, agent.pos[0] + dr))
            nc = max(0, min(self.grid_size - 1, agent.pos[1] + dc))
            new_positions.append((nr, nc))

        # Collision detection — if two agents try same cell, they stay
        for i in range(self.n_agents):
            for j in range(i + 1, self.n_agents):
                if new_positions[i] == new_positions[j]:
                    new_positions[i] = self.agents[i].pos
                    new_positions[j] = self.agents[j].pos
                    rewards[i] -= 50.0
                    rewards[j] -= 50.0
                    self.agents[i].collisions += 1
                    self.agents[j].collisions += 1

        # Apply moves and handle packages
        for i, agent in enumerate(self.agents):
            agent.pos = new_positions[i]
            agent.steps += 1
            rewards[i] -= 0.1  # latency penalty per step

            if agent.package is None:
                # Look for pickup
                for pkg in self.packages:
                    if not pkg.delivered and pkg.pickup == agent.pos:
                        agent.package = pkg
                        rewards[i] += 2.0  # picked up
                        break
            else:
                # Check dropoff
                if agent.package.dropoff == agent.pos:
                    agent.package.delivered = True
                    agent.deliveries += 1
                    rewards[i] += 10.0  # delivery reward
                    agent.package = None

        done = (self.step_count >= self.max_steps or
                all(p.delivered for p in self.packages))

        obs = [self._get_obs(a) for a in self.agents]
        return obs, rewards, done

    def _get_obs(self, agent: Agent) -> np.ndarray:
        # 5x5 local view
        view = np.zeros(25, dtype=np.float32)
        agent_positions = {a.pos: a.id for a in self.agents}
        pickup_positions = {p.pickup for p in self.packages if not p.delivered and
                            not any(a.package == p for a in self.agents)}
        dropoff_positions = {p.dropoff for p in self.packages if not p.delivered}

        idx = 0
        for dr in range(-2, 3):
            for dc in range(-2, 3):
                r, c = agent.pos[0] + dr, agent.pos[1] + dc
                if r < 0 or r >= self.grid_size or c < 0 or c >= self.grid_size:
                    view[idx] = 1.0  # wall
                elif (r, c) in agent_positions and agent_positions[(r, c)] != agent.id:
                    view[idx] = 2.0  # other agent
                elif (r, c) in pickup_positions:
                    view[idx] = 3.0  # pickup
                elif (r, c) in dropoff_positions:
                    view[idx] = 4.0  # dropoff
                idx += 1

        # Agent state: has package + direction to target
        has_package = 1.0 if agent.package else 0.0
        if agent.package:
            target = agent.package.dropoff
        else:
            # Find nearest pickup
            available = [p for p in self.packages if not p.delivered and
                         not any(a.package == p for a in self.agents)]
            if available:
                target = min(available, key=lambda p: abs(p.pickup[0] - agent.pos[0]) +
                             abs(p.pickup[1] - agent.pos[1])).pickup
            else:
                target = agent.pos

        dx = (target[0] - agent.pos[0]) / self.grid_size
        dy = (target[1] - agent.pos[1]) / self.grid_size

        return np.concatenate([view, [has_package, dx, dy]])

    def get_stats(self) -> dict:
        return {
            "total_deliveries": sum(a.deliveries for a in self.agents),
            "total_collisions": sum(a.collisions for a in self.agents),
            "packages_delivered": sum(1 for p in self.packages if p.delivered),
            "total_packages": self.n_packages,
            "steps": self.step_count,
        }
