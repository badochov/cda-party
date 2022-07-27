import { BgMsg, ControlBgMsg, ParticipantChangeBgMsg } from '../background';
import { Control, User } from '../messages';

export class CDAParty {
  private sessionId: string | null = null;
  private constructor(private video: HTMLVideoElement, private user: User) {
    this.setEventListeners();
  }

  static async new(video: HTMLVideoElement, user: User): Promise<CDAParty> {
    const introduceMsg: BgMsg<'introduce'> = {
      type: 'introduce',
      data: {
        user: user,
      },
    };
    await chrome.runtime.sendMessage(introduceMsg);

    return new CDAParty(video, user);
  }

  async newSession() {
    const msg: BgMsg<'new'> = {
      type: 'new',
      data: null,
    };
    console.log('uuu');
    this.sessionId = <string>await chrome.runtime.sendMessage(msg);
    console.log('bbbb');
    console.log(this.sessionId);
  }

  async joinSession(sessionId: string) {
    const msg: BgMsg<'join'> = {
      type: 'join',
      data: {
        sessionId,
      },
    };
    await chrome.runtime.sendMessage(msg);
  }

  async leaveSession() {
    const msg: BgMsg<'leave'> = {
      type: 'leave',
      data: null,
    };
    await chrome.runtime.sendMessage(msg);
  }

  private setEventListeners() {
    this.setVideoEventHandlers();
    this.setMsgEventHandlers();
  }

  private setMsgEventHandlers() {
    chrome.runtime.onMessage.addListener((data, _sender, _resp) => {
      console.log(data);
      if (data.type === 'participantChange') {
        this.handleParticipantChangeMsg(data);
      } else if (data.type === 'control') {
        this.handleControlMsg(data);
      }
    });
  }

  private handleControlMsg(data: ControlBgMsg) {
    this.video.currentTime = data.data.time;
    switch (data.data.control) {
      case 'pause':
        this.video.pause();
        break;
      case 'play':
        this.video.play();
        break;
      case 'seek':
        break;
    }
  }

  private handleParticipantChangeMsg(data: ParticipantChangeBgMsg) {
    console.log(data); // TODO
  }

  private setVideoEventHandlers() {
    this.video.onplay = (ev: Event) => this.playHandler(ev);
    this.video.onpause = (ev: Event) => this.pauseHandler(ev);
    this.video.onseeked = (ev: Event) => this.seekedHandler(ev);
  }

  private playHandler(ev: Event) {
    if (ev.isTrusted) {
      this.controlHandler('play');
    }
  }

  private pauseHandler(ev: Event) {
    if (ev.isTrusted) {
      this.controlHandler('pause');
    }
  }

  private seekedHandler(ev: Event) {
    if (ev.isTrusted) {
      this.controlHandler('seek');
    }
  }

  private async controlHandler(controlName: Control) {
    const msg: BgMsg<'control'> = {
      type: 'control',
      data: {
        control: controlName,
        time: this.video.currentTime,
      },
    };
    await chrome.runtime.sendMessage(msg);
  }
}
