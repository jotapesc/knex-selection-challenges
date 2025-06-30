# Knex Seleção 2025/2026 - Teste Técnico: Backend

![knex-logo](<knex-logo.png>)


[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Prisma ORM](https://img.shields.io/badge/Prisma-%232D3748?style=for-the-badge&logo=Prisma&logoColor=white)](https://www.prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-%23316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org)

 ## Como desenvolvi a minha avaliação
 
* A solução para o desafio foi desenvolvida usando meus conhecimentos em TypeScript, Node.js, Prisma e PostgreSQL;
* Foi utilizado o Insomnia para o teste das rotas HTTP;
* O projeto visa seguir o padrão RESTful.

## Como utilizar o sistema

* Clone este repositório: 
``` 
git clone https://github.com/jotapesc/knex-selection-challenges.git
```
* Acesse a nova pasta "knex-selection-challenges";
* Com o Node.js instalado, use o comando:
``` 
npm init -y
```
* Após isso, use o comando:
``` 
npx prisma migrate dev --name init
npx prisma generate
```
* Importe o arquivo "Rotas HTTP.yaml" no Insomnia
* Com o Docker, use a imagem do postgres e crie o container para testes
* Utilize esse comando para rodar o projeto
```
node ./backend/prod/app.js
```



## Autor
### João Pedro de Sousa Costa


