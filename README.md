<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/2d00431c-c83f-4e7c-919d-a0f150e3fdfc

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Acceso de administrador

Los PIN ya no se guardan en documentos públicos. Cada PIN vive en `secrets/{ámbito}`, que solo pueden leer sus administradores:

- `secrets/global`: PIN de organizador. Da acceso a todos los torneos y permite crear, duplicar, archivar y borrar torneos.
- `secrets/{idTorneo}`: PIN de un torneo concreto. Al crear un torneo se genera uno aleatorio y se muestra en pantalla.
- `secrets/legacy`: PIN del torneo antiguo (colecciones raíz).

El superadministrador (cuenta de Google indicada en `firestore.rules`) y los usuarios listados en `admins/{uid}` son administradores globales sin PIN. Al cambiar un PIN se anulan todos los accesos abiertos con el anterior.

### Primera puesta en marcha tras actualizar

1. Despliega reglas y web a la vez: `npm run build` y luego `firebase deploy --only firestore:rules,hosting`.
2. Entra con la cuenta de Google del superadministrador.
3. En la portada pulsa **PIN global** y define el PIN de organizador.
4. Abre el torneo legacy: el PIN antiguo (que era público) se borra solo y la app pide uno nuevo.

### Probar las reglas

Las pruebas de `tests/firestore-rules.test.mjs` usan el emulador de Firestore (requiere Java 17 con firebase-tools 13, o Java 21 con versiones más recientes):

```
npm i -D firebase-tools@13 @firebase/rules-unit-testing
npx firebase emulators:exec --project demo-hockey --only firestore "node tests/firestore-rules.test.mjs"
```
