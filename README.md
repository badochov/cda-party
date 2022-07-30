# CDA Party
Rozszerzenie pozwalające tworzyć pokoje do wspólnego oglądania filmów na CDA.

## Instalacje
Rozszerzenie jest gotowe do pobrania dla
- [Chrome](https://chrome.google.com/webstore/detail/bpjfnkpgoookljinbamidhkjjhffifdn)

## Budowanie
Do zbudowania potrzebne są:
- Node.js v18.5.0
- npm 8.13.2

Aby zbudować rozszerzenie należy wykonać:
```
npm install
npm run build
```
Do pakowania rozszerzenia w zipa, służy komenda:
```
npm run release
```

## Firefox
Niestety rozszerzenie wymaga Manifest v3, który obecnie w firefoxie jest dostępny tylko w wersji deweloperskiej.
Rozszerzenie można zainstalować ręcznie pobierając werjse na chrome z zakłądki releases.
## Przydatne linki
- [ręczna instalacja rozszerzenia w Firefoxie](https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/)
- [włączenie deweloperskiego supportu dla Manifest v3](https://extensionworkshop.com/documentation/develop/manifest-v3-migration-guide/)