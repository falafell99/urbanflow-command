"""
UrbanFlow - API Server
Exposes trained PPO agents via REST API so the React frontend
can visualize real agent decisions.

Usage:
    python server.py        # requires trained models in models/
"""

import os
import json
from flask import Flask, jsonify, request
from flask_cors import CORS
from env import UrbanGridEnv
from agent import PPOAgent

app = Flask(__name__)
CORS(app)

GRID_SIZE = 10
N_AGENTS = 4
N_PACKAGES = 8

env = UrbanGridEnv(grid_size=GRID_SIZE, n_agents=N_AGENTS, n_packages=N_PACKAGES)
agents = [PPOAgent(obs_size=UrbanGridEnv.OBS_SIZE) for _ in range(N_AGENTS)]
current_obs = None


def load_models():
    for i, agent in enumerate(agents):
        path = f"models/agent_{i}.pt"
        if os.path.exists(path):
            agent.load(path)
        else:
            print(f"Warning: {path} not found — using untrained agent")


@app.route("/simulation/reset", methods=["POST"])
def reset():
    global current_obs
    current_obs = env.reset()
    return jsonify({
        "grid_size": GRID_SIZE,
        "agents": [{"id": a.id, "pos": list(a.pos)} for a in env.agents],
        "packages": [{"id": p.id, "pickup": list(p.pickup),
                      "dropoff": list(p.dropoff), "delivered": p.delivered}
                     for p in env.packages],
    })


@app.route("/simulation/step", methods=["POST"])
def step():
    global current_obs
    if current_obs is None:
        current_obs = env.reset()

    actions = [agents[i].act(current_obs[i]) for i in range(N_AGENTS)]
    current_obs, rewards, done = env.step(actions)

    return jsonify({
        "agents": [{"id": a.id, "pos": list(a.pos),
                    "deliveries": a.deliveries,
                    "has_package": a.package is not None}
                   for a in env.agents],
        "packages": [{"id": p.id, "pickup": list(p.pickup),
                      "dropoff": list(p.dropoff), "delivered": p.delivered}
                     for p in env.packages],
        "rewards": rewards,
        "done": done,
        "stats": env.get_stats(),
    })


@app.route("/simulation/stats", methods=["GET"])
def stats():
    return jsonify(env.get_stats())


@app.route("/training/history", methods=["GET"])
def history():
    path = "models/history.json"
    if not os.path.exists(path):
        return jsonify({"error": "No training history found. Run train.py first."})
    with open(path) as f:
        return jsonify(json.load(f))


@app.route("/health", methods=["GET"])
def health():
    models_ready = all(os.path.exists(f"models/agent_{i}.pt") for i in range(N_AGENTS))
    return jsonify({"status": "ok", "models_loaded": models_ready})


if __name__ == "__main__":
    load_models()
    app.run(host="0.0.0.0", port=8000, debug=False)
