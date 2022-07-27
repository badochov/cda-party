import { io, Socket } from 'socket.io-client';
import {
  ClientMsg,
  ClientMsgData,
  ClientMsgDataTypes,
  CLIENT_MESSAGES,
  ControlMsg,
  ParticipantChangeMsg,
  SERVER_MESSAGES,
  SessionCreatedMsg,
} from '../messages';

interface SenderData {
  socket: Socket;
  tab: chrome.tabs.Tab;
}

interface Senders {
  senders: Record<number, SenderData>;
  nextId: number;
}

export interface BgMsg<K extends keyof ClientMsgDataTypes> extends ClientMsgData<K> {
  type: K;
}

export interface ParticipantChangeBgMsg extends ParticipantChangeMsg {
  type: 'participantChange';
}

export interface ControlBgMsg extends ControlMsg {
  type: 'control';
}

const senders: Senders = { senders: {}, nextId: 0 };
let msgId = 0;

chrome.runtime.onMessage.addListener((msg, { tab }, res) => {
  msgHandler(msg, <chrome.tabs.Tab>tab).then(res);
  return true;
});

function msgHandler(msg: any, tab: chrome.tabs.Tab): Promise<any> {
  switch (msg.type) {
    case CLIENT_MESSAGES.introduce:
      return handlerIntroduce(<BgMsg<'introduce'>>msg, tab);
    case CLIENT_MESSAGES.new:
      return handlerNew(<BgMsg<'new'>>msg, tab);
    case CLIENT_MESSAGES.join:
      return handlerJoin(<BgMsg<'join'>>msg, tab);
    case CLIENT_MESSAGES.leave:
      return handlerLeave(<BgMsg<'leave'>>msg, tab);
    case 'control': {
      return handlerControl(<BgMsg<'control'>>msg, tab);
    }
    default:
      return new Promise((_, rej) => rej('unexpected msg: ' + JSON.stringify(msg)));
  }
}

function handlerNew(msg: BgMsg<'new'>, tab: chrome.tabs.Tab): Promise<string> {
  return new Promise(res => {
    let sender = getSender(tab);

    const mId = msgId++;
    const action = ({ sessionId, messageId }: SessionCreatedMsg) => {
      console.log(sessionId, messageId);
      if (messageId === mId) {
        sender.socket.off(SERVER_MESSAGES.sessionCreated, action);
        res(sessionId);
      }
    };

    sender.socket.on(SERVER_MESSAGES.sessionCreated, action);
    sender.socket.emit(CLIENT_MESSAGES.new, toServerMsg(msg, mId));
  });
}

function setupSender(sender: SenderData) {
  sender.socket.on(SERVER_MESSAGES.participantChange, msg => handleParticipantChange(msg, sender));
  sender.socket.on(SERVER_MESSAGES.control, handleControlReceived);
}

function handleParticipantChange(msg: ParticipantChangeMsg, sender: SenderData) {
  const tabId = sender.tab.id;
  if (tabId === undefined) {
    console.warn('no sender for msg', msg);
    return;
  }
  chrome.tabs.sendMessage(tabId, { type: 'participantChange', ...msg });
}

function handleControlReceived(msg: ControlMsg, sender: SenderData) {
  const tabId = sender.tab.id;
  if (tabId === undefined) {
    console.warn('no sender for msg', msg);
    return;
  }
  chrome.tabs.sendMessage(tabId, { type: 'control', ...msg });
}

function handlerJoin(msg: BgMsg<'join'>, tab: chrome.tabs.Tab): Promise<void> {
  return handleErrorableMessage(msg, tab, CLIENT_MESSAGES.join, SERVER_MESSAGES.sessionJoined);
}

function handlerLeave(msg: BgMsg<'leave'>, tab: chrome.tabs.Tab): Promise<void> {
  return handleErrorableMessage(msg, tab, CLIENT_MESSAGES.leave, SERVER_MESSAGES.sessionLeft);
}

function handlerControl(msg: BgMsg<'control'>, tab: chrome.tabs.Tab): Promise<void> {
  return handleErrorableMessage(msg, tab, CLIENT_MESSAGES.control, SERVER_MESSAGES.controlAck);
}

function handlerIntroduce(msg: BgMsg<'introduce'>, tab: chrome.tabs.Tab): Promise<any> {
  return handleErrorableMessage(msg, tab, CLIENT_MESSAGES.introduce, SERVER_MESSAGES.introduceAck);
}

async function handleErrorableMessage<K extends keyof ClientMsgDataTypes>(
  msg: BgMsg<K>,
  tab: chrome.tabs.Tab,
  send: string,
  expect: string,
): Promise<void> {
  return new Promise((res, rej) => {
    const sender = getSender(tab);
    const mId = nextMsgId();
    const action = ({ error, messageId }: { error?: string; messageId: number }) => {
      if (messageId === mId) {
        sender.socket.off(expect, action);
        if (error !== undefined) {
          rej(error);
        }
        res();
      }
    };
    sender.socket.on(expect, action);
    sender.socket.emit(send, toServerMsg(msg, mId));
  });
}

function toServerMsg<K extends keyof ClientMsgDataTypes>(msg: ClientMsgData<K>, messageId: number): ClientMsg<K> {
  return { data: msg.data, messageId };
}

function nextMsgId(): number {
  return msgId++;
}

function getSender(tab: chrome.tabs.Tab): SenderData {
  let sender = senders.senders[tab.id ?? 0];
  if (sender === undefined) {
    const socket = io('ws://localhost:3000', {
      transports: ['websocket'],
    });

    senders.senders[tab.id ?? 0] = sender = { socket, tab };

    setupSender(sender);
  }
  return sender;
}
