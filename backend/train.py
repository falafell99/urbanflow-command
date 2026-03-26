"""
UrbanFlow - Training Script
Trains N independent PPO agents on the delivery grid.

Usage:
    python train.py                        # default: 500 episodes
    python train.py --episodes 1000        # longer training
    python train.py --agents 4 --grid 10   # custom setup
"""

import argparse
import os
import json
import numpy as np
from env import UrbanGridEnv
from agent import PPOAgent

UPDATE_EVERY = 20  # update policy every N episodes


def train(grid_size: int, n_agents: int, n_packages: int, episodes: int):
    env = UrbanGridEnv(grid_size=grid_size, n_agents=n_agents, n_packages=n_packages)
    agents = [PPOAgent(obs_size=UrbanGridEnv.OBS_SIZE) for _ in range(n_agents)]

    os.makedirs("models", exist_ok=True)
    history = []

    print(f"Training {n_agents} agents on {grid_size}x{grid_size} grid for {episodes} episodes")
    print("-" * 60)

    for ep in range(1, episodes + 1):
        obs = env.reset()
        ep_rewards = [0.0] * n_agents
        done = False

        while not done:
            actions = [agents[i].act(obs[i]) for i in range(n_agents)]
            next_obs, rewards, done = env.step(actions)

            for i in range(n_agents):
                agents[i].store(rewards[i], done)
                ep_rewards[i] += rewards[i]

            obs = next_obs

        # Update policies every UPDATE_EVERY episodes
        if ep % UPDATE_EVERY == 0:
            for agent in agents:
                agent.update()

        stats = env.get_stats()
        avg_reward = np.mean(ep_rewards)
        history.append({
            "episode": ep,
            "avg_reward": round(avg_reward, 2),
            "deliveries": stats["packages_delivered"],
            "collisions": stats["total_collisions"],
        })

        if ep % 50 == 0:
            delivery_rate = stats["packages_delivered"] / stats["total_packages"] * 100
            print(f"Ep {ep:4d} | avg_reward: {avg_reward:7.2f} | "
                  f"delivered: {stats['packages_delivered']}/{stats['total_packages']} "
                  f"({delivery_rate:.0f}%) | collisions: {stats['total_collisions']}")

    # Save models
    for i, agent in enumerate(agents):
        agent.save(f"models/agent_{i}.pt")

    # Save training history
    with open("models/history.json", "w") as f:
        json.dump(history, f)

    print("\nTraining complete.")
    print(f"Models saved to models/")

    # Final eval
    print("\n--- Final Evaluation (10 episodes) ---")
    eval_deliveries = []
    eval_collisions = []
    for _ in range(10):
        obs = env.reset()
        done = False
        while not done:
            actions = [agents[i].act(obs[i]) for i in range(n_agents)]
            obs, _, done = env.step(actions)
        stats = env.get_stats()
        eval_deliveries.append(stats["packages_delivered"])
        eval_collisions.append(stats["total_collisions"])

    print(f"Avg deliveries: {np.mean(eval_deliveries):.1f}/{n_packages}")
    print(f"Avg collisions: {np.mean(eval_collisions):.1f}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--grid", type=int, default=10)
    parser.add_argument("--agents", type=int, default=4)
    parser.add_argument("--packages", type=int, default=8)
    parser.add_argument("--episodes", type=int, default=500)
    args = parser.parse_args()

    train(args.grid, args.agents, args.packages, args.episodes)
