import { io, Socket } from 'socket.io-client';
import {
  ClientMsg,
  ClientMsgData,
  ClientMsgDataTypes,
  Control,
  ControlMsg,
  ParticipantChangeMsg,
  SessionCreatedMsg,
  User,
  MsgAck,
} from '../messages';
import { ServerMsgMap, ClientMsgMap } from '../socketTypes';

export class CdaPartyBase {
  sessionId: string | null = null;
  socket: Socket<ServerMsgMap, ClientMsgMap>;
  protected messageId: number = 0;
  protected introduced: boolean = false;
  protected ignoreNextSeek: boolean = false;
  protected ignoreNextPlay: boolean = false;
  protected ignoreNextPause: boolean = false;

  constructor(public video: HTMLVideoElement, protected user: User, url: string) {
    this.socket = io(url);
    this.setupSocket();
  }

  introduce(): Promise<void> {
    if (this.introduced) {
      return new Promise(res => res());
    }
    const msg: ClientMsgData<'introduce'> = {
      data: {
        user: this.user,
      },
    };
    return this.handleMsgAck(msg, 'introduce');
  }

  setEventListeners() {
    this.video.onplay = (ev: Event) => this.playHandler(ev);
    this.video.onpause = (ev: Event) => this.pauseHandler(ev);
    this.video.onseeking = (ev: Event) => this.seekingHandler(ev);
  }

  removeEventListeners() {
    this.video.onplay = null;
    this.video.onpause = null;
    this.video.onseeking = null;
  }

  protected async handleControlMsg(data: ControlMsg) {
    switch (data.data.control) {
      case 'pause':
        this.ignoreNextPause = true;
        this.video.pause();
        break;
      case 'play':
        this.ignoreNextPlay = true;
        this.ignoreNextSeek = true;
        this.video.currentTime = data.data.time;
        break;
      case 'seek':
        this.ignoreNextSeek = true;
        this.video.currentTime = data.data.time;
        break;
    }
  }

  protected handleParticipantChangeMsg(data: ParticipantChangeMsg) {
    console.log(data); // TODO
  }

  protected async playHandler(ev: Event) {
    console.log('PLAY', ev);
    if (this.ignoreNextPlay) {
      this.ignoreNextPlay = false;
      return;
    }
    // Wait for play confirmation.
    this.ignoreNextPause = true;
    await this.video.pause();
    this.controlHandler('play');
  }

  protected pauseHandler(ev: Event) {
    if (this.ignoreNextPause) {
      this.ignoreNextPause = false;
      return;
    }
    this.controlHandler('pause');
  }

  protected async seekingHandler(ev: Event) {
    if (this.ignoreNextSeek) {
      this.ignoreNextSeek = false;
      return;
    }
    this.controlHandler('seek');
  }

  protected async controlHandler(controlName: Control): Promise<void> {
    const msg: ClientMsgData<'control'> = {
      data: {
        control: controlName,
        time: this.video.currentTime,
      },
    };
    await this.handleMsgAck(msg, 'control');
    return await this.handleControlMsg({ ...msg, user: this.user });
  }

  async handleMsgAck<K extends keyof ClientMsgMap>(msg: ClientMsgData<K>, send: K): Promise<void> {
    return new Promise((res, rej) => {
      const mId = this.nextMsgId();
      const action = ({ messageId, error }: MsgAck) => {
        if (messageId === mId) {
          this.socket.off('msgAck', action);
          if (error !== undefined) {
            rej(error);
          }
          res();
        }
      };
      this.socket.on('msgAck', action);
      // TODO fix this type issue.
      // @ts-ignore
      this.socket.emit(send, this.toServerMsg<K>(msg, mId));
    });
  }

  nextMsgId() {
    return this.messageId++;
  }

  protected setupSocket() {
    this.socket.on('participantChange', (msg: ParticipantChangeMsg) => this.handleParticipantChangeMsg(msg));
    this.socket.on('control', (msg: ControlMsg) => this.handleControlMsg(msg));
  }

  toServerMsg<K extends keyof ClientMsgDataTypes>(msg: ClientMsgData<K>, messageId: number): ClientMsg<K> {
    return { data: msg.data, messageId };
  }
}

export function newParty(video: HTMLVideoElement, user: User, url: string = 'https://badochov.pl:8443') {
  const party = new CdaPartyBase(video, user, url);
  return new JoinableCdaParty(party);
}

export class JoinableCdaParty {
  constructor(private party: CdaPartyBase) {
    party.removeEventListeners();
  }

  async newSession(): Promise<LeavableCdaParty> {
    this.party.sessionId = await this.newSessionRequest();
    console.log(this.party.sessionId);
    return new LeavableCdaParty(this.party);
  }

  protected async newSessionRequest(): Promise<string> {
    this.party.video.pause();
    await this.party.introduce();
    return await new Promise(res => {
      const mId = this.party.nextMsgId();
      const action = ({ sessionId, messageId }: SessionCreatedMsg) => {
        if (messageId === mId) {
          this.party.socket.off('sessionCreated', action);
          res(sessionId);
        }
      };

      this.party.socket.on('sessionCreated', action);
      this.party.socket.emit('new', this.party.toServerMsg<'new'>({ data: null }, mId));
    });
  }

  async joinSession(sessionId: string): Promise<LeavableCdaParty> {
    await this.party.video.pause();
    await this.party.introduce();
    const msg: ClientMsgData<'join'> = { data: { sessionId } };
    await this.party.handleMsgAck(msg, 'join');
    return new LeavableCdaParty(this.party);
  }
}

export class LeavableCdaParty {
  constructor(private party: CdaPartyBase) {
    party.setEventListeners();
  }

  getSessionId(): string {
    return <string>this.party.sessionId;
  }

  async leaveSession(): Promise<JoinableCdaParty> {
    const msg: ClientMsgData<'leave'> = { data: null };
    await this.party.handleMsgAck(msg, 'leave');
    return new JoinableCdaParty(this.party);
  }
}
