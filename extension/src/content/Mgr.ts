import { JoinableCdaParty, LeavableCdaParty, newParty } from './CdaParty';

export async function startMgr(video: HTMLVideoElement, sessionId: string | null): Promise<void> {
  const party = newParty(video, '');
  return await startJoinableMgr(video, party, sessionId ?? undefined);
}

async function startJoinableMgr(video: HTMLVideoElement, joinableParty: JoinableCdaParty, sessionId?: string): Promise<void> {
  if (sessionId !== undefined) {
    const leavablePart = await joinableParty.joinSession(sessionId);
    return await startLeavableMgr(video, leavablePart);
  }
  const newListener = (message: any, _sender: chrome.runtime.MessageSender, resp: (resp?: any) => void): boolean => {
    if (message === 'new') {
      joinableParty.newSession().then(leavableParty => {
        chrome.runtime.onMessage.removeListener(newListener);
        startLeavableMgr(video, leavableParty).then(() => {
          resp(getUrl(leavableParty.getSessionId()));
        });
      });
      return true;
    }
    return false;
  };

  chrome.runtime.onMessage.addListener(newListener);
}

function getUrl(sessionId: string): string {
  const url = window.location.href.split(/[?#]/)[0];
  return `${url}?cdaPartyJoin=${sessionId}`;
}

async function startLeavableMgr(video: HTMLVideoElement, leavableParty: LeavableCdaParty): Promise<void> {
  const leaveListener = (message: any, _sender: chrome.runtime.MessageSender, resp: (resp?: any) => void): boolean => {
    if (message === 'leave') {
      leavableParty.leaveSession().then(joinableCdaParty => {
        chrome.runtime.onMessage.removeListener(leaveListener);
        startJoinableMgr(video, joinableCdaParty).then(() => {
          resp();
        });
      });
      return true;
    }
    return false;
  };

  chrome.runtime.onMessage.addListener(leaveListener);
}
