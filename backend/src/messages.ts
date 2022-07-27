export const CLIENT_MESSAGES = {
  introduce: 'introduce',
  new: 'new',
  join: 'join',
  leave: 'leave',
  control: 'control',
};

export type Control = 'play' | 'pause' | 'seek';

export type User = string;

export interface ClientMsgDataTypes {
  introduce: { user: User };
  new: null;
  join: { sessionId: string };
  leave: {};
  control: { control: Control; time: number };
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
  controlAck: 'controlAck',
  introduceAck: 'introduceAck',
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

export type IntroduceAck = ClientMessageReply;

export interface SessionCreatedMsg extends SessionCreatedMsgData, ClientMessageReply {}

export interface SessionJoinedMsg extends ErrorData, ClientMessageReply {}
export interface SessionLeftMsg extends ErrorData, ClientMessageReply {}
export interface ControlAcknowledgedMsg extends ErrorData, ClientMessageReply {}

export interface WithUser {
  user: User;
}

export interface ParticipantChangeMsg extends WithUser {
  joined: boolean;
}

export interface ControlMsg extends ClientMsgData<'control'>, WithUser {}
