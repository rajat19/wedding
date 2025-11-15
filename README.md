## Rajat × Shraddha — Wedding Website (React + Vite + Firebase)

A modern, responsive wedding website built with React, Vite, TypeScript, Tailwind CSS, and shadcn/ui. It includes pages for events, RSVP, travel info, registry, gallery, a guestbook, authentication, profile management, and an admin area.

### Tech stack

- React 18 + TypeScript
- Vite 5 (dev server on port 8080)
- Tailwind CSS + tailwindcss-animate
- shadcn/ui (Radix UI primitives) in `src/components/ui`
- React Router v6
- Firebase (Auth, Firestore, Storage)
- Form handling via `react-hook-form` and `zod`
- Optional charts via `recharts`

---

### Quick start

1) Install dependencies
```bash
npm install
```
2) Start the dev server (http://localhost:8080)
```bash
npm run dev
```
3) Build for production
```bash
npm run build
```
4) Preview the production build
```bash
npm run preview
```

Node 18+ is required (Node 20+ recommended).

---

### Available scripts

- `npm run dev`: Start Vite dev server on port 8080
- `npm run build`: Create production build in `dist/`
- `npm run build:dev`: Build using development mode
- `npm run preview`: Preview built app locally
- `npm run lint`: Lint with ESLint
- `npm run lint:fix`: Autofix lint issues
- `npm run format`: Format with Prettier
- `npm run format:check`: Check formatting

---

### Project structure (high-level)

```
src/
  components/
    ui/                # shadcn/ui components
    Layout.tsx
    NavLink.tsx
  hooks/
    useAuth.tsx
    use-toast.ts
    use-mobile.tsx
  integrations/
    firebase/
      client.ts        # Firebase initialization (current config lives here)
  lib/
    constant.ts        # Wedding names, dates, and site constants
    firebase.ts        # Auth/Profile helpers (uses Firestore)
    utils.ts
  pages/
    Home.tsx
    Events.tsx
    Gallery.tsx
    Guestbook.tsx
    RSVP.tsx
    Registry.tsx
    Travel.tsx
    Auth.tsx
    Profile.tsx
    Admin.tsx
    NotFound.tsx
  App.tsx
  main.tsx
```

Path alias: import from `src` using `@` (configured in `vite.config.ts`).

---

### Routes (SPA)

- `/` Home
- `/events`
- `/gallery`
- `/guestbook`
- `/rsvp`
- `/registry`
- `/travel`
- `/auth`
- `/profile`
- `/admin`
- `*` NotFound

---

### Configuration

#### 1) Wedding content

Customize names, dates, times, location, and invite links in:

- `src/lib/constant.ts`

#### 2) Firebase

This project uses Firebase Auth, Firestore, and Storage. Ensure these products are enabled in your Firebase project.

Firebase initialization is currently hardcoded in:

- `src/integrations/firebase/client.ts`

Replace the existing config with your own Firebase config values from the Firebase Console (Project settings → General → Your apps).

```ts
// src/integrations/firebase/client.ts
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID",
};
```

If you prefer environment variables, you can refactor the file to read from Vite envs (e.g., `import.meta.env.VITE_FIREBASE_API_KEY`) and create a `.env.local`:
```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
```

Auth:
- Email/Password and Google Sign-In are supported. Enable providers in Firebase Console → Authentication → Sign-in method.

Firestore:
- Profiles are stored in the `profiles` collection.
- Admin checks look for either `profiles/{userId}.is_admin === true` or a legacy `user_roles` collection document.
- Configure Firestore Security Rules to match your needs. At minimum, restrict writes so users can edit only their own profile. See Firebase docs for best practices.

Storage:
- Used for user avatars or media if you extend functionality. Configure Storage Security Rules accordingly.

---

### Styling and UI

- Tailwind is configured in `tailwind.config.ts`. Content scanning includes `./src/**/*.{ts,tsx}` (and a few conventional paths).
- shadcn/ui components live in `src/components/ui`. You can add new ones following the shadcn/ui docs.
- The project uses CSS variables for theme tokens (colors, radius, shadows). See `src/index.css`.

---

### Development notes

- Vite dev server runs on `http://localhost:8080` by default. You can change host/port in `vite.config.ts`.
- Import using the `@` alias from `src` (e.g., `import { AuthProvider } from "@/hooks/useAuth"`).
- Keep code formatted and linted with `npm run format` and `npm run lint`.

---

### Acknowledgements
- [shadcn/ui](https://ui.shadcn.com) and Radix UI
- Vite, Tailwind CSS, React ecosystem


