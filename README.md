# 🍅 Pomodoro CLI

Temporizador Pomodoro para la terminal, escrito en Node.js. Sin dependencias externas.

## Uso

```bash
node pomodoro.js
```

## Opciones del menú

| Tecla | Acción |
|-------|--------|
| `1` | Iniciar un pomodoro (55 min de trabajo) |
| `2` | Ver historial de sesiones de hoy |
| `3` | Salir |

Durante el temporizador, pulsa **`q`** para detenerlo y volver al menú.

## Ciclo automático

El temporizador sigue el ciclo estándar Pomodoro:

- **55 min** trabajo → **5 min** descanso corto
- Cada 4 pomodoros → **15 min** descanso largo

## Historial

Las sesiones se guardan en `sessions.json` (en la misma carpeta). Cada entrada incluye fecha, tarea y minutos trabajados.

## Requisitos

- Node.js 14 o superior
- Terminal con soporte ANSI (color y `rawMode`)
