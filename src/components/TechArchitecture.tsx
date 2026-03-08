import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const sections = [
  {
    id: 'ctde',
    title: 'Centralized Training, Decentralized Execution (CTDE)',
    content:
      'During training, all agents share a centralized critic that has access to the global state. This critic evaluates the joint actions of all agents, enabling coordinated learning. At execution time, each agent uses only its local observations through a decentralized policy network, making decisions independently without inter-agent communication overhead.',
  },
  {
    id: 'ppo',
    title: 'Proximal Policy Optimization (PPO)',
    content:
      'PPO uses a clipped surrogate objective to ensure policy updates remain within a trust region. The ratio of new-to-old policy probabilities is clipped to [1-ε, 1+ε], preventing destructively large updates. Combined with a value function baseline and generalized advantage estimation (GAE), this yields stable multi-agent learning dynamics.',
  },
  {
    id: 'reward',
    title: 'Reward Shaping Function',
    content:
      'R = Σ(Deliveries × 10) − (WaitTime × 0.5) − (Collisions × 50). Deliveries are strongly incentivized (+10 per successful delivery), while collisions carry a heavy penalty (−50) to encourage spatial awareness. Idle wait time incurs a small cost (−0.5) to promote continuous movement and efficient task assignment.',
  },
  {
    id: 'pathfinding',
    title: 'Collision Avoidance & Pathfinding',
    content:
      'Agents use a greedy Manhattan-distance heuristic for path planning, augmented with collision detection at each timestep. When a collision is detected, agents apply a jitter displacement and recalculate their path to target. The exploration rate (ε) introduces stochastic target selection, preventing convergence to suboptimal agent-task assignments.',
  },
];

export default function TechArchitecture() {
  return (
    <div className="glass-card p-4">
      <h3 className="font-mono text-xs tracking-widest uppercase text-muted-foreground mb-3">
        Technical Architecture
      </h3>
      <Accordion type="multiple" className="space-y-1">
        {sections.map(s => (
          <AccordionItem key={s.id} value={s.id} className="border-border/30">
            <AccordionTrigger className="text-sm font-medium text-foreground/80 hover:text-neon-cyan transition-colors py-3 hover:no-underline">
              {s.title}
            </AccordionTrigger>
            <AccordionContent className="text-xs text-muted-foreground leading-relaxed pb-3">
              {s.content}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
