import { ClientMsg, ClientMsgDataTypes, ControlMsg, MsgAck, ParticipantChangeMsg, SessionCreatedMsg } from './messages';

export type ClientMsgMap = {
  [key in keyof ClientMsgDataTypes]: (msg: ClientMsg<key>) => void;
};

export type ServerMsgMap = {
  sessionCreated: (msg: SessionCreatedMsg) => void;
  participantChange: (msg: ParticipantChangeMsg) => void;
  control: (msg: ControlMsg) => void;
  msgAck: (msg: MsgAck) => void;
};
