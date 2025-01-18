import type { MergeEvent } from '@/types/merge';

export class MockMergeWebSocket extends EventTarget {
  private mockQuestions = [
    {
      id: 'q1',
      content: 'There are conflicting property values for node "Person_123". Local has name="John Smith" while prod has name="John A. Smith". Which version should we keep?',
      options: [
        { label: 'Keep Local Version', value: 'local' },
        { label: 'Keep Production Version', value: 'prod' },
        { label: 'Merge Both', value: 'merge' }
      ],
      previewGraphData: {
        nodes: [
          { id: 'Person_123', label: 'Person', properties: { name: 'John Smith' }, status: 'modified' },
          { id: 'Company_456', label: 'Company', properties: { name: 'Acme Corp' } }
        ],
        edges: [
          { source: 'Person_123', target: 'Company_456', label: 'WORKS_AT' }
        ]
      }
    },
    {
      id: 'q2',
      content: 'New relationship type "MANAGES" detected in local graph. Should this be added to the production schema?',
      options: [
        { label: 'Yes, add to schema', value: 'yes' },
        { label: 'No, skip these relationships', value: 'no' },
        { label: 'Need more information', value: 'more_info' }
      ],
      previewGraphData: {
        nodes: [
          { id: 'Person_123', label: 'Person', properties: { name: 'John A. Smith' } },
          { id: 'Person_789', label: 'Person', properties: { name: 'Alice Brown' } },
          { id: 'Company_456', label: 'Company', properties: { name: 'Acme Corp' } }
        ],
        edges: [
          { source: 'Person_123', target: 'Person_789', label: 'MANAGES', status: 'new' },
          { source: 'Person_123', target: 'Company_456', label: 'WORKS_AT' },
          { source: 'Person_789', target: 'Company_456', label: 'WORKS_AT' }
        ]
      }
    }
  ];

  private currentProgress = 0;
  private currentQuestionIndex = 0;
  private interval: NodeJS.Timeout | null = null;

  constructor(url: string) {
    super();
    this.startMockUpdates();
  }

  private startMockUpdates() {
    this.interval = setInterval(() => {
      if (this.currentProgress < 100) {
        if (this.currentProgress === 30 || this.currentProgress === 70) {
          // Send a question at specific progress points
          this.sendMockQuestion();
        } else {
          // Send progress update
          this.sendMockProgress();
        }
      } else {
        this.sendMockComplete();
        if (this.interval) {
          clearInterval(this.interval);
        }
      }
    }, 2000);
  }

  private sendMockProgress() {
    this.currentProgress += 10;
    const event: MergeEvent = {
      type: 'PROGRESS',
      payload: {
        mergeId: 'mock-merge-1',
        timestamp: new Date().toISOString(),
        data: {
          progress: this.currentProgress,
          currentStep: `Processing node batch ${Math.floor(this.currentProgress / 10)}`,
          requiresAction: false,
          graphData: {
            nodes: [
              { id: 'Person_123', label: 'Person', properties: { name: 'John A. Smith' }, status: this.currentProgress < 50 ? 'processing' : 'merged' },
              { id: 'Person_789', label: 'Person', properties: { name: 'Alice Brown' }, status: this.currentProgress < 80 ? 'pending' : 'processing' },
              { id: 'Company_456', label: 'Company', properties: { name: 'Acme Corp' }, status: this.currentProgress < 30 ? 'pending' : 'merged' }
            ],
            edges: [
              { source: 'Person_123', target: 'Person_789', label: 'MANAGES', status: this.currentProgress < 90 ? 'pending' : 'merged' },
              { source: 'Person_123', target: 'Company_456', label: 'WORKS_AT', status: this.currentProgress < 40 ? 'pending' : 'merged' },
              { source: 'Person_789', target: 'Company_456', label: 'WORKS_AT', status: this.currentProgress < 70 ? 'pending' : 'merged' }
            ]
          }
        }
      }
    };
    this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(event) }));
  }

  private sendMockQuestion() {
    const question = this.mockQuestions[this.currentQuestionIndex];
    const event: MergeEvent = {
      type: 'QUESTION',
      payload: {
        mergeId: 'mock-merge-1',
        timestamp: new Date().toISOString(),
        data: {
          questionId: question.id,
          content: question.content,
          options: question.options,
          requiresAction: true,
          previewGraphData: question.previewGraphData
        }
      }
    };
    this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(event) }));
    this.currentQuestionIndex = (this.currentQuestionIndex + 1) % this.mockQuestions.length;
  }

  private sendMockComplete() {
    const event: MergeEvent = {
      type: 'COMPLETE',
      payload: {
        mergeId: 'mock-merge-1',
        timestamp: new Date().toISOString(),
        data: {
          message: 'Merge completed successfully',
          stats: {
            nodesProcessed: 150,
            edgesProcessed: 300,
            conflictsResolved: 5
          },
          finalGraphData: {
            nodes: [
              { id: 'Person_123', label: 'Person', properties: { name: 'John A. Smith' }, status: 'merged' },
              { id: 'Person_789', label: 'Person', properties: { name: 'Alice Brown' }, status: 'merged' },
              { id: 'Company_456', label: 'Company', properties: { name: 'Acme Corp' }, status: 'merged' }
            ],
            edges: [
              { source: 'Person_123', target: 'Person_789', label: 'MANAGES', status: 'merged' },
              { source: 'Person_123', target: 'Company_456', label: 'WORKS_AT', status: 'merged' },
              { source: 'Person_789', target: 'Company_456', label: 'WORKS_AT', status: 'merged' }
            ]
          }
        }
      }
    };
    this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(event) }));
  }

  send(data: string) {
    // Mock handling user responses
    console.log('Mock WebSocket received:', data);
  }

  close() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }
}
