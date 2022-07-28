import { newParty } from './CdaParty';

main();

function main() {
  const video = getVideoEl();
  if (video === null) {
    console.error("Can't find video element");
    return;
  }
  const adVideo = getAdEl();
  waitForAdVideo(video, adVideo);
}

function getVideoEl(): HTMLVideoElement | null {
  return document.querySelector('video.pb-video-player');
}

function getAdEl(): HTMLVideoElement | null {
  return document.querySelector('video.pb-ad-video-player');
}

function waitForAdVideo(video: HTMLVideoElement, adVideo: HTMLVideoElement | null) {
  if (adVideo === null) {
    start(video);
  } else {
    setTimeout(() => main(), 1000); // TODO change to mutation observer
  }
}

async function start(video: HTMLVideoElement) {
  const party = newParty(video, 'Alojzy');
  const urlSearchParams = new URLSearchParams(window.location.search);
  const sessionId = urlSearchParams.get('cdaPartySessionId');
  if (sessionId === null) {
    await party.newSession();
  } else {
    await party.joinSession(sessionId);
  }
}
