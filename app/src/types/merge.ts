export type MergeStrategy = 'SAFE' | 'FORCE' | 'INTERACTIVE';

export type MergeStatus = 'IN_PROGRESS' | 'WAITING_INPUT' | 'COMPLETED' | 'FAILED';

export interface MergeInitRequest {
  sourceGraphId: string;
  targetGraphId: string;
  mergeStrategy: MergeStrategy;
}

export interface MergeStatusResponse {
  status: MergeStatus;
  progress: number;
  currentStep: string;
  requiresAction: boolean;
}

export interface MergeResponse {
  questionId: string;
  response: any;
  context: Record<string, any>;
}

export interface ChatMessage {
  id: string;
  role: 'agent' | 'user';
  content: string;
  timestamp: string;
  requiresAction?: boolean;
  questionId?: string;
  options?: Array<{
    label: string;
    value: any;
  }>;
}

export interface MergeEvent {
  type: 'PROGRESS' | 'QUESTION' | 'ERROR' | 'COMPLETE';
  payload: {
    mergeId: string;
    timestamp: string;
    data: any;
  };
}
