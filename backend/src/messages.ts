export type Control = 'play' | 'pause' | 'seek';

export type User = string;

export interface ClientMsgDataTypes {
  introduce: { user: User };
  new: null;
  join: { sessionId: string };
  leave: null;
  control: { control: Control; time: number };
}

export interface ClientMsgData<K extends keyof ClientMsgDataTypes> {
  data: ClientMsgDataTypes[K];
}

export interface ClientMsg<K extends keyof ClientMsgDataTypes> extends ClientMsgData<K> {
  messageId: number;
}

export interface MsgAck {
  messageId: number;
  error?: string;
}

export interface SessionCreatedMsgData {
  sessionId: string;
}

export interface SessionCreatedMsg extends SessionCreatedMsgData, MsgAck {}

export interface WithUser {
  user: User;
}

export interface ParticipantChangeMsg extends WithUser {
  joined: boolean;
}

export interface ControlMsg extends ClientMsgData<'control'>, WithUser {}
