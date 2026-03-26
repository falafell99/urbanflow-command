"""
UrbanFlow - PPO Agent
Proximal Policy Optimization for multi-agent delivery.
Each agent has its own PPO instance (independent learners).
"""

import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
from torch.distributions import Categorical


class PolicyNetwork(nn.Module):
    """Actor-Critic network shared trunk with separate heads."""

    def __init__(self, obs_size: int, n_actions: int, hidden: int = 128):
        super().__init__()
        self.trunk = nn.Sequential(
            nn.Linear(obs_size, hidden),
            nn.ReLU(),
            nn.Linear(hidden, hidden),
            nn.ReLU(),
        )
        self.actor = nn.Linear(hidden, n_actions)   # policy head
        self.critic = nn.Linear(hidden, 1)           # value head

    def forward(self, x: torch.Tensor):
        features = self.trunk(x)
        logits = self.actor(features)
        value = self.critic(features)
        return logits, value

    def get_action(self, obs: np.ndarray):
        x = torch.FloatTensor(obs).unsqueeze(0)
        with torch.no_grad():
            logits, value = self(x)
        dist = Categorical(logits=logits)
        action = dist.sample()
        return action.item(), dist.log_prob(action).item(), value.item()


class PPOAgent:
    """
    PPO with clipped surrogate objective.
    Hyperparameters tuned for small grid environments.
    """

    def __init__(self, obs_size: int, n_actions: int = 5,
                 lr: float = 3e-4, gamma: float = 0.99,
                 clip_eps: float = 0.2, epochs: int = 4):
        self.gamma = gamma
        self.clip_eps = clip_eps
        self.epochs = epochs

        self.policy = PolicyNetwork(obs_size, n_actions)
        self.optimizer = optim.Adam(self.policy.parameters(), lr=lr)

        # Rollout buffer
        self.obs_buf: list[np.ndarray] = []
        self.act_buf: list[int] = []
        self.logp_buf: list[float] = []
        self.rew_buf: list[float] = []
        self.val_buf: list[float] = []
        self.done_buf: list[bool] = []

    def act(self, obs: np.ndarray):
        action, logp, value = self.policy.get_action(obs)
        self.obs_buf.append(obs)
        self.act_buf.append(action)
        self.logp_buf.append(logp)
        self.val_buf.append(value)
        return action

    def store(self, reward: float, done: bool):
        self.rew_buf.append(reward)
        self.done_buf.append(done)

    def _compute_returns(self) -> torch.Tensor:
        returns = []
        G = 0.0
        for r, done in zip(reversed(self.rew_buf), reversed(self.done_buf)):
            if done:
                G = 0.0
            G = r + self.gamma * G
            returns.insert(0, G)
        returns = torch.FloatTensor(returns)
        # Normalize
        returns = (returns - returns.mean()) / (returns.std() + 1e-8)
        return returns

    def update(self):
        if len(self.obs_buf) < 2:
            self._clear()
            return {}

        returns = self._compute_returns()
        obs = torch.FloatTensor(np.array(self.obs_buf))
        actions = torch.LongTensor(self.act_buf)
        old_logps = torch.FloatTensor(self.logp_buf)
        values = torch.FloatTensor(self.val_buf)

        advantages = returns - values
        advantages = (advantages - advantages.mean()) / (advantages.std() + 1e-8)

        total_loss = 0.0
        for _ in range(self.epochs):
            logits, new_values = self.policy(obs)
            dist = Categorical(logits=logits)
            new_logps = dist.log_prob(actions)
            entropy = dist.entropy().mean()

            # PPO clipped objective
            ratio = (new_logps - old_logps).exp()
            surr1 = ratio * advantages
            surr2 = torch.clamp(ratio, 1 - self.clip_eps, 1 + self.clip_eps) * advantages
            actor_loss = -torch.min(surr1, surr2).mean()

            # Value loss
            critic_loss = nn.functional.mse_loss(new_values.squeeze(), returns)

            loss = actor_loss + 0.5 * critic_loss - 0.01 * entropy

            self.optimizer.zero_grad()
            loss.backward()
            nn.utils.clip_grad_norm_(self.policy.parameters(), 0.5)
            self.optimizer.step()
            total_loss += loss.item()

        self._clear()
        return {"loss": total_loss / self.epochs}

    def _clear(self):
        self.obs_buf.clear()
        self.act_buf.clear()
        self.logp_buf.clear()
        self.rew_buf.clear()
        self.val_buf.clear()
        self.done_buf.clear()

    def save(self, path: str):
        torch.save(self.policy.state_dict(), path)
        print(f"Model saved to {path}")

    def load(self, path: str):
        self.policy.load_state_dict(torch.load(path, map_location="cpu"))
        self.policy.eval()
        print(f"Model loaded from {path}")
