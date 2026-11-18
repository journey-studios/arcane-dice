# Rolagens arcanas

Dois replays de dados em Three.js e um modo livre, com efeitos visuais, gravações de dados metálicos e controles de duração, velocidade, som e bandeja.

[Experimentar a animação](https://journey-studios.github.io/arcane-dice/)

## Desenvolvimento

Com Node.js 22.12 ou mais recente, execute `npm ci` e `npm run dev`. Para gerar o HTML que funciona offline, execute `npm run build:standalone`.

O GitHub Pages serve `docs/index.html`. Para atualizar a versão publicada, gere esse arquivo com `npm run build:standalone -- docs/index.html` e envie as alterações para `main`.

Os créditos das gravações estão em [src/audio/recordings/CREDITS.txt](src/audio/recordings/CREDITS.txt).
