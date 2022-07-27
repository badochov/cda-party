export const CLIENT_MESSAGES = {
  new: 'new',
  join: 'join',
  leave: 'leave',
  control: 'control',
};

export type Control = 'play' | 'pause' | 'seek';

export type User = string;

export interface ClientMsgDataTypes {
  new: null;
  join: { sessionId: string };
  leave: { sessionId: string };
  control: { sessionId: string; control: Control; time: number };
}

export interface ClientMsgData<K extends keyof ClientMsgDataTypes> {
  data: ClientMsgDataTypes[K];
}

export interface ClientMsg<K extends keyof ClientMsgDataTypes> extends ClientMsgData<K> {
  messageId: number;
}

export const SERVER_MESSAGES = {
  sessionCreated: 'sessionCreated',
  sessionJoined: 'sessionJoined',
  sessionLeft: 'sessionLeft',
  controlAcknowledged: 'controlAcknowledged',
  participantChange: 'participantChange',
  control: 'control',
};

export interface ClientMessageReply {
  messageId: number;
}

export interface SessionCreatedMsgData {
  sessionId: string;
}

export interface ErrorData {
  error?: string;
}

export interface SessionCreatedMsg extends SessionCreatedMsgData, ClientMessageReply {}

export interface SessionJoinedMsg extends ErrorData, ClientMessageReply {}
export interface SessionLeftMsg extends ErrorData, ClientMessageReply {}
export interface ControlMsg extends ErrorData, ClientMessageReply {}

export interface ParticipantChangeMsg {
  sessionId: string;
  name: User;
  joined: boolean;
}

export interface ControlMsg {
  sessionId: string;
  name: User;
  control: Control;
  time: number;
}
