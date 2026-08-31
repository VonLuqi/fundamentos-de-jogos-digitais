# ▲ FUNDAMENTOS DE JOGOS DIGITAIS

> Plataforma gamificada de ensino de design e desenvolvimento de jogos digitais.

![Status](https://img.shields.io/badge/status-em_desenvolvimento-4ade80?style=for-the-badge)
![Version](https://img.shields.io/badge/version-0.1.0-a855f7?style=for-the-badge)
![Stack](https://img.shields.io/badge/stack-HTML5%20%7C%20CSS3%20%7C%20JS-22d3ee?style=for-the-badge)

## Sobre o Projeto

**Fundamentos de Jogos Digitais** é uma plataforma web educacional com progressão gamificada. O aluno avança por módulos de conteúdo, completa aulas e acumula **XP** para subir de nível — como em um RPG de design de jogos.

A interface segue uma estética **Cyber-Gothic**: dark mode profundo (grafite/preto) combinado com acentos neon (roxo, ciano, verde elétrico) e tipografia estilo terminal sci-fi.

## Roadmap

- [x] Estrutura base e infraestrutura (front-end estático)
- [x] Design System "Cyber-Gothic" com variáveis CSS
- [x] Módulo 01 — A Regra do Jogo (Unplugged)
- [ ] Sistema de login / autenticação de jogadores
- [ ] Sistema de XP e progressão de nível por leitura de aulas
- [ ] Conquistas (badges) e HUD de progresso
- [ ] Persistência de progresso (localStorage → API futura)

## Estrutura de Diretórios

```text
fundamentos-de-jogos-digitais/
├── index.html                  # Terminal principal (hub)
├── css/
│   └── style.css               # Design System Cyber-Gothic
├── js/
│   └── main.js                 # Entry point (gamificação futura)
├── assets/
│   ├── images/                 # Imagens e ilustrações
│   ├── icons/                  # Ícones da interface
│   └── docs/
│       └── aulas/              # PDFs das aulas
│           └── AULA-1-A-REGRA-DO-JOGO-UNPLUGGED.pdf
├── pages/
│   └── aula-1.html             # Páginas internas (rotas das aulas)
├── .gitignore
└── README.md
```

## Como Executar

Por se tratar de front-end estático, basta abrir o `index.html` no navegador. Para uma experiência com caminhos relativos corretos e ES Modules, recomenda-se um servidor local:

```bash
# Opção 1 — Python
python -m http.server 8000

# Opção 2 — Node.js
npx serve .

# Opção 3 — VS Code (extensão Live Server)
# Clique com o botão direito em index.html → "Open with Live Server"
```

Acesse: `http://localhost:8000`

## Tecnologias

| Camada      | Tecnologia                     |
| ----------- | ------------------------------ |
| Estrutura   | HTML5 semântico                |
| Estilização | CSS3 (Design Tokens / :root)   |
| Lógica      | JavaScript (ES Modules)        |
| Fontes      | Orbitron, Share Tech Mono      |

## Contribuindo

1. Faça um fork do projeto
2. Crie uma branch: `git checkout -b feature/minha-feature`
3. Commit suas alterações: `git commit -m "feat: minha feature"`
4. Push para a branch: `git push origin feature/minha-feature`
5. Abra um Pull Request

## Licença

Este projeto está sob a licença MIT. Consulte o arquivo `LICENSE` para mais detalhes.

---

`<SYS>` **Desenvolvido por [VonLuqi](https://github.com/VonLuqi)** `</SYS>`
