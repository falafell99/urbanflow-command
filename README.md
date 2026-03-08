# 🚄 UrbanFlow AI: Multi-Agent Reinforcement Learning Simulator

> **Autonomous logistics optimization engine for dense urban environments using MARL and PPO.**

---

### 🚀 Quick Links
| 🌐 Live Simulation | 📂 Source Code | 🛠 AI Framework |
| :--- | :--- | :--- |
| [**Deploy on Vercel**](https://urbanflow-command.vercel.app) | [**Repository**](https://github.com/falafell99/urbanflow-command.git) | ![PPO-Stable](https://img.shields.io/badge/Algorithm-PPO--CTDE-3b82f6) |

---

## 📌 Overview
**UrbanFlow AI** is a high-fidelity simulation platform designed to solve the "Last Mile" delivery problem. By utilizing **Multi-Agent Reinforcement Learning (MARL)**, the system coordinates multiple autonomous units in a shared grid, optimizing for throughput while maintaining zero-collision safety margins.

This project demonstrates the bridge between **Deep Learning research** and **Real-time Systems engineering**.

---

## 🧠 Core AI Architecture

### 1️⃣ Training Framework: CTDE
The system implements **Centralized Training, Decentralized Execution (CTDE)**. 
* **During Training:** The model sees the global state to learn optimal cooperation.
* **During Execution:** Each agent makes independent decisions based on local observations, ensuring the system scales to hundreds of units.

### 2️⃣ Decision Making: PPO
Agents use **Proximal Policy Optimization (PPO)** to ensure stable learning. The policy network maps local grid observations (20x20) to discrete actions: `[Move N, S, E, W, Wait]`.

### 3️⃣ The Reward Function
The "intelligence" of the system is governed by a multi-objective reward function $R$:
$$R = \sum (D_{success} \times 10) - (C_{collision} \times 50) - (L_{latency} \times 0.1)$$
* **$D_{success}$:** High incentive for completed deliveries.
* **$C_{collision}$:** Heavy penalty for any agent-to-agent conflict.
* **$L_{latency}$:** Subtle pressure to find the shortest possible path.

---

## 🛠 Advanced Features

### 🚦 Intelligent Scenario Management
* **Peak Congestion Stress-Test:** Doubling agent density to observe emergent cooperative behavior (e.g., yielding at intersections).
* **Emergency Rerouting:** Real-time intersection blocking to test the agents' ability to dynamically recalculate paths.

### 📊 Deep Telemetry & Analytics
* **Active Asset Inspector:** Drill down into any agent's live state (UUID, Task Queue, Battery, and Confidence Score).
* **Network Throughput:** Real-time sparklines tracking global system efficiency and latency spikes.
* **Neural Heatmaps:** Visualizing high-traffic "Decision Nodes" within the urban grid.

---

## 💻 Tech Stack
* **Frontend:** React 18, TypeScript (High-performance state management).
* **Visuals:** Framer Motion for smooth agent transitions & Tailwind CSS.
* **Architecture:** Modular component design for scalable simulation layers.
* **Deployment:** CI/CD via GitHub & Vercel.

---

## 👨‍💻 About the Author
**Rafael Ibayev**
* **Education:** Computer Science Student at **ELTE University**, Budapest.
* **Achievements:** International STEM Olympiad Gold Medalist.
* **Interests:** AI Safety, Robotics, and High-Performance Systems.

---

## 📄 License
This project is licensed under the **MIT License**.
