import { RAV_ASSISTANT_RESEARCH_MATERIAL } from './rav-assistant-research-material-v1.js?v=4.0.578';
import { RAV_ASSISTANT_RESEARCH_COAST } from './rav-assistant-research-coast-v1.js?v=4.0.578';

export const RAV_ASSISTANT_RESEARCH_KNOWLEDGE = Object.freeze([
  ...RAV_ASSISTANT_RESEARCH_MATERIAL,
  ...RAV_ASSISTANT_RESEARCH_COAST
]);

export const RAV_ASSISTANT_RESEARCH_EXAMPLES = Object.freeze(Object.fromEntries(
  RAV_ASSISTANT_RESEARCH_KNOWLEDGE.map(topic => [topic.id, topic.examples])
));
