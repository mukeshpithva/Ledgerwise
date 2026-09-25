import api from './api';

export async function startRemoteAgent({ prompt, data, onEvent, onRunCreated }) {
  const { data: run } = await api.post('/agent-runs', { prompt, snapshot: data });
  onRunCreated?.(run);
  return new Promise((resolve, reject) => {
    const source = new EventSource(`${api.defaults.baseURL}/agent-runs/${run.id}/events`);
    source.onmessage = (message) => {
      const event = JSON.parse(message.data);
      onEvent?.(event);
      if (event.type === 'complete') {
        source.close();
        resolve(event.result);
      }
      if (event.type === 'error') {
        source.close();
        reject(new Error(event.detail || 'The agent run failed.'));
      }
    };
    source.onerror = () => {
      source.close();
      reject(new Error('The agent stream disconnected before the run completed.'));
    };
  });
}

export async function approveRemoteAgent(runId) {
  const { data } = await api.post(`/agent-runs/${runId}/approve`);
  return data;
}

export async function getRemoteAgentRun(runId) {
  const { data } = await api.get(`/agent-runs/${runId}`);
  return data;
}
