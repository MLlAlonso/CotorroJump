# Primera Misión 🎮

**Primera Misión** es un juego arcade de desplazamiento vertical desarrollado con **Phaser 3**, pensado como base para un juego estilo _plataformas infinitas_. El objetivo es construir progresivamente un sistema completo con física arcade, controles adaptativos, generación procedural, y diseño responsive.

---

## 🚀 Características actuales

- Motor Phaser 3 con configuración responsive
- Jugador controlable con teclado o botones táctiles
- Salto automático al aterrizar en plataformas
- Plataforma base inicial para pruebas
- Envolvimiento horizontal del jugador (pantalla wrap)

---

## 🧱 Arquitectura del proyecto

```plaintext
├── index.html                 # Entrada principal del juego
├── assets/
│   ├── js/
│   │   └── main.js            # Lógica principal del juego (Phaser)
│   └── styles/
│       └── main.css           # Estilos para layout y botones
├── src/
│   └── ...                    # Archivos multimedia futuros (sprites, sonidos, etc.)
