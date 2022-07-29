const newButton = <HTMLInputElement>document.getElementById('new');
const messageSpan = <HTMLSpanElement>document.getElementById('message');

newButton.onclick = async () => {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs?.at(0);
  if (tab === undefined) {
    console.error('Run CDA Party without tab opened');
    return;
  }
  if (tab.id === undefined) {
    console.error('Tab has no id');
    return;
  }
  const url = await chrome.tabs.sendMessage(tab.id, 'new');
  // @ts-ignore
  await navigator.clipboard.writeText(url);
  messageSpan.textContent = 'Skopiowano adres pokoju do schowka.';
};
