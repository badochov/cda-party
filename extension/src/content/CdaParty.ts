import { io, Socket } from 'socket.io-client';
import {
  ClientMsg,
  ClientMsgData,
  ClientMsgDataTypes,
  CLIENT_MESSAGES,
  Control,
  ControlMsg,
  ParticipantChangeMsg,
  SERVER_MESSAGES,
  SessionCreatedMsg,
  User,
} from '../messages';

export class CdaPartyBase {
  sessionId: string | null = null;
  socket: Socket;
  protected messageId: number = 0;
  protected introduced: boolean = false;
  protected ignoreNextSeek: boolean = false;
  protected ignoreNextPlay: boolean = false;
  protected ignoreNextPause: boolean = false;

  constructor(protected video: HTMLVideoElement, protected user: User, url: string) {
    this.socket = io(url);
    this.setupSocket();
    this.setEventListeners();
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
    return this.handleErrorableMessage(msg, CLIENT_MESSAGES.introduce, SERVER_MESSAGES.introduceAck);
  }

  protected setEventListeners() {
    this.setVideoEventHandlers();
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

  protected setVideoEventHandlers() {
    this.video.onplay = (ev: Event) => this.playHandler(ev);
    this.video.onpause = (ev: Event) => this.pauseHandler(ev);
    this.video.onseeking = (ev: Event) => this.seekingHandler(ev);
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

  protected controlHandler(controlName: Control): Promise<void> {
    const msg: ClientMsgData<'control'> = {
      data: {
        control: controlName,
        time: this.video.currentTime,
      },
    };
    return this.handleErrorableMessage(msg, CLIENT_MESSAGES.control, SERVER_MESSAGES.controlAck);
  }

  async handleErrorableMessage<K extends keyof ClientMsgDataTypes>(msg: ClientMsgData<K>, send: string, expect: string): Promise<void> {
    return new Promise((res, rej) => {
      const mId = this.nextMsgId();
      const action = ({ error, messageId }: { error?: string; messageId: number }) => {
        if (messageId === mId) {
          this.socket.off(expect, action);
          if (error !== undefined) {
            rej(error);
          }
          res();
        }
      };
      this.socket.on(expect, action);
      this.socket.emit(send, this.toServerMsg(msg, mId));
    });
  }

  nextMsgId() {
    return this.messageId++;
  }

  protected setupSocket() {
    this.socket.on(SERVER_MESSAGES.participantChange, (msg: ParticipantChangeMsg) => this.handleParticipantChangeMsg(msg));
    this.socket.on(SERVER_MESSAGES.control, (msg: ControlMsg) => this.handleControlMsg(msg));
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
  constructor(private party: CdaPartyBase) {}

  async newSession(): Promise<LeavableCdaParty> {
    this.party.sessionId = await this.newSessionRequest();
    console.log(this.party.sessionId);
    return new LeavableCdaParty(this.party);
  }

  protected async newSessionRequest(): Promise<string> {
    await this.party.introduce();
    return await new Promise(res => {
      const mId = this.party.nextMsgId();
      const action = ({ sessionId, messageId }: SessionCreatedMsg) => {
        if (messageId === mId) {
          this.party.socket.off(SERVER_MESSAGES.sessionCreated, action);
          res(sessionId);
        }
      };

      this.party.socket.on(SERVER_MESSAGES.sessionCreated, action);
      this.party.socket.emit(CLIENT_MESSAGES.new, this.party.toServerMsg({ data: null }, mId));
    });
  }

  async joinSession(sessionId: string): Promise<LeavableCdaParty> {
    await this.party.introduce();
    const msg: ClientMsgData<'join'> = { data: { sessionId } };
    await this.party.handleErrorableMessage(msg, CLIENT_MESSAGES.join, SERVER_MESSAGES.sessionJoined);
    return new LeavableCdaParty(this.party);
  }
}

export class LeavableCdaParty {
  constructor(private party: CdaPartyBase) {}

  async leaveSession(): Promise<JoinableCdaParty> {
    const msg: ClientMsgData<'leave'> = { data: null };
    await this.party.handleErrorableMessage(msg, CLIENT_MESSAGES.leave, SERVER_MESSAGES.sessionLeft);
    return new JoinableCdaParty(this.party);
  }
}
